package com.enjoytrip.backend.domain.survey.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.GroupMember;
import com.enjoytrip.backend.domain.group.repository.GroupMemberRepository;
import com.enjoytrip.backend.domain.group.service.CurrentUserResolver;
import com.enjoytrip.backend.domain.group.service.GroupAccessValidator;
import com.enjoytrip.backend.domain.survey.dto.GroupPersonaResponse;
import com.enjoytrip.backend.domain.survey.dto.GroupPersonaResponse.PersonaVector;
import com.enjoytrip.backend.domain.survey.entity.SurveyDimension;
import com.enjoytrip.backend.domain.survey.entity.UserPreference;
import com.enjoytrip.backend.domain.survey.repository.UserPreferenceRepository;

import lombok.RequiredArgsConstructor;

/**
 * FR-SURVEY-03: 그룹 성향 매칭.
 * 활성 멤버들의 5차원 성향 벡터를 평균내고, 멤버 간 코사인 유사도로 일치율을, 차원별 분산으로 충돌 차원을 계산한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GroupPersonaService {

    // SurveyDimension.values() 순서(ACTIVITY, FOOD, PACE, URBAN_NATURE, TIME_PREF)와 정확히 일치해야 한다.
    private static final String[] DIMENSION_LABELS = {
            "활동성", "먹거리", "여행 페이스", "도심·자연 선호", "시간대 선호"
    };

    private final GroupMemberRepository groupMemberRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final CurrentUserResolver currentUserResolver;
    private final GroupAccessValidator groupAccessValidator;

    public GroupPersonaResponse getGroupPersona(Long groupId) {
        User current = currentUserResolver.getCurrentUser();
        groupAccessValidator.validateMember(groupId, current.getId());

        List<GroupMember> members = groupMemberRepository.findByTravelGroupIdAndLeftAtIsNull(groupId);
        int memberCount = members.size();

        List<Long> userIds = members.stream()
                .map(member -> member.getUser().getId())
                .toList();
        List<double[]> vectors = userIds.isEmpty()
                ? List.of()
                : userPreferenceRepository.findByUserIdIn(userIds).stream()
                        .map(this::toVector)
                        .toList();

        int respondedCount = vectors.size();
        if (respondedCount == 0) {
            return new GroupPersonaResponse(memberCount, 0, null, null, null, null);
        }

        PersonaVector average = average(vectors);
        if (respondedCount == 1) {
            // 한 명만 응답하면 유사도/충돌을 계산할 수 없으므로 평균만 제공한다.
            return new GroupPersonaResponse(memberCount, 1, average, null, null, null);
        }

        int matchRate = matchRate(vectors);
        int conflictIndex = mostConflictingDimensionIndex(vectors);
        SurveyDimension conflictDimension = SurveyDimension.values()[conflictIndex];
        String conflictMessage = "이 그룹은 " + DIMENSION_LABELS[conflictIndex] + " 선호가 크게 갈립니다.";

        return new GroupPersonaResponse(
                memberCount, respondedCount, average, matchRate, conflictDimension.name(), conflictMessage);
    }

    private double[] toVector(UserPreference p) {
        return new double[]{p.getActivity(), p.getFood(), p.getPace(), p.getUrbanNature(), p.getTimePref()};
    }

    // 차원별 평균 벡터.
    private PersonaVector average(List<double[]> vectors) {
        double[] sum = new double[5];
        for (double[] v : vectors) {
            for (int d = 0; d < 5; d++) {
                sum[d] += v[d];
            }
        }
        int n = vectors.size();
        return new PersonaVector(sum[0] / n, sum[1] / n, sum[2] / n, sum[3] / n, sum[4] / n);
    }

    // 멤버 쌍별 코사인 유사도의 평균을 0~100% 일치율로 환산한다.
    private int matchRate(List<double[]> vectors) {
        double total = 0;
        int pairs = 0;
        for (int i = 0; i < vectors.size(); i++) {
            for (int j = i + 1; j < vectors.size(); j++) {
                total += cosineSimilarity(vectors.get(i), vectors.get(j));
                pairs++;
            }
        }
        double average = total / pairs;
        double clamped = Math.max(0.0, Math.min(1.0, average));
        return (int) Math.round(clamped * 100);
    }

    private double cosineSimilarity(double[] a, double[] b) {
        double dot = 0;
        double normA = 0;
        double normB = 0;
        for (int d = 0; d < a.length; d++) {
            dot += a[d] * b[d];
            normA += a[d] * a[d];
            normB += b[d] * b[d];
        }
        if (normA == 0 || normB == 0) {
            return 0; // 영벡터는 유사도를 정의할 수 없으므로 0으로 처리한다.
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // 차원별 분산이 가장 큰(=멤버 선호가 가장 갈리는) 차원 인덱스.
    private int mostConflictingDimensionIndex(List<double[]> vectors) {
        int maxIndex = 0;
        double maxVariance = -1;
        for (int d = 0; d < 5; d++) {
            double variance = variance(vectors, d);
            if (variance > maxVariance) {
                maxVariance = variance;
                maxIndex = d;
            }
        }
        return maxIndex;
    }

    private double variance(List<double[]> vectors, int dimension) {
        double mean = 0;
        for (double[] v : vectors) {
            mean += v[dimension];
        }
        mean /= vectors.size();

        double sumSquaredDiff = 0;
        for (double[] v : vectors) {
            double diff = v[dimension] - mean;
            sumSquaredDiff += diff * diff;
        }
        return sumSquaredDiff / vectors.size();
    }
}

package com.enjoytrip.backend.global.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.survey.entity.SurveyDimension;
import com.enjoytrip.backend.domain.survey.entity.SurveyQuestion;
import com.enjoytrip.backend.domain.survey.repository.SurveyQuestionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner{
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final SurveyQuestionRepository surveyQuestionRepository;


	@Override
	public void run(ApplicationArguments args) throws Exception {

		// 이미 테스트 유저가 있으면 스킵
		if(userRepository.existsByEmail("test@test.com")) {
			log.info("테스트 유저가 이미 있어 스킵함");
		} else {
			User testUser = User.builder()
					.email("test@test.com")
					.password(passwordEncoder.encode("test1234"))
					.name("테스트선생님")
					.build();

			userRepository.save(testUser);
			log.info("테스트 유저 생성 : test@test.com / test1234");
		}

		// 설문 문항 시드 (이미 있으면 스킵)
		if (surveyQuestionRepository.count() == 0) {
			List<SurveyQuestion> questions = List.of(
				SurveyQuestion.builder().code("A03").dimension(SurveyDimension.ACTIVITY).content("하루에 1만 보 이상 걷는 일정도 괜찮다").isReverse(false).displayOrder(1).build(),
				SurveyQuestion.builder().code("A05").dimension(SurveyDimension.ACTIVITY).content("여행은 결국 쉬려고 가는 거다").isReverse(true).displayOrder(2).build(),
				SurveyQuestion.builder().code("F01").dimension(SurveyDimension.FOOD).content("줄을 1시간 서더라도 유명한 맛집은 꼭 가야 한다").isReverse(false).displayOrder(3).build(),
				SurveyQuestion.builder().code("F02").dimension(SurveyDimension.FOOD).content("식사는 끼니만 때우면 된다").isReverse(true).displayOrder(4).build(),
				SurveyQuestion.builder().code("P01").dimension(SurveyDimension.PACE).content("시간 단위로 계획을 짜놓는 게 마음이 편하다").isReverse(false).displayOrder(5).build(),
				SurveyQuestion.builder().code("P05").dimension(SurveyDimension.PACE).content("일정 사이에 비어있는 시간이 있어야 마음이 편하다").isReverse(true).displayOrder(6).build(),
				SurveyQuestion.builder().code("P07").dimension(SurveyDimension.PACE).content("사진 찍느라 한 장소에서 30분 이상 머무는 것도 괜찮다").isReverse(false).displayOrder(7).build(),
				SurveyQuestion.builder().code("U01").dimension(SurveyDimension.URBAN_NATURE).content("도시의 활기찬 분위기를 좋아한다").isReverse(false).displayOrder(8).build(),
				SurveyQuestion.builder().code("U02").dimension(SurveyDimension.URBAN_NATURE).content("자연 풍경 속에 있을 때 가장 행복하다").isReverse(true).displayOrder(9).build(),
				SurveyQuestion.builder().code("T01").dimension(SurveyDimension.TIME_PREF).content("일출을 보러 새벽에 일어날 수 있다").isReverse(false).displayOrder(10).build(),
				SurveyQuestion.builder().code("T03").dimension(SurveyDimension.TIME_PREF).content("밤 늦게까지 야경이나 술 한잔을 즐기고 싶다").isReverse(true).displayOrder(11).build(),
				SurveyQuestion.builder().code("T04").dimension(SurveyDimension.TIME_PREF).content("저녁 10시 전에는 숙소에 들어가는 게 좋다").isReverse(false).displayOrder(12).build()
			);
			surveyQuestionRepository.saveAll(questions);
			log.info("설문 문항 12개 시드 완료");
		}
	}

}

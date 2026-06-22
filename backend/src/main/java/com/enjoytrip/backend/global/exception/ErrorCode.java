package com.enjoytrip.backend.global.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 모든 에러 종류를 한 곳에 정의하는 enum
 * 새로운 에러가 필요할 떄마다 이곳에다가 추가
 * 
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    
    // Auth
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "만료된 토큰입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    
    // Group
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "Group not found."),
    GROUP_MEMBER_NOT_FOUND(HttpStatus.FORBIDDEN, "User is not a member of this group."),
    GROUP_OWNER_REQUIRED(HttpStatus.FORBIDDEN, "Group owner permission is required."),
    GROUP_OWNER_CANNOT_LEAVE(HttpStatus.BAD_REQUEST, "Owner must transfer ownership or dissolve group before leaving."),
    GROUP_FULL(HttpStatus.BAD_REQUEST, "Group member limit exceeded. Maximum is 8."),
    INVALID_INVITE_CODE(HttpStatus.BAD_REQUEST, "Invalid invite code."),
    DUPLICATE_GROUP_MEMBER(HttpStatus.CONFLICT, "User already joined this group."),

    // Expense
    EXPENSE_RATIO_SUM_INVALID(HttpStatus.BAD_REQUEST, "분담 비율의 합이 100%가 아닙니다."),
    EXPENSE_AMOUNT_SUM_INVALID(HttpStatus.BAD_REQUEST, "분담 금액의 합이 총 금액과 일치하지 않습니다."),

    // Settlement
    SETTLEMENT_ALREADY_STARTED(HttpStatus.CONFLICT, "이미 정산 확인이 시작되었습니다."),
    SETTLEMENT_NOT_REQUIRED(HttpStatus.BAD_REQUEST, "완료할 송금 내역이 없습니다."),
    SETTLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "정산 송금 내역을 찾을 수 없습니다."),
    SETTLEMENT_CONFIRMATION_FORBIDDEN(HttpStatus.FORBIDDEN, "본인의 정산 송금만 확인할 수 있습니다."),
    SETTLEMENT_INVALID_STATUS(HttpStatus.CONFLICT, "현재 상태에서는 정산 확인을 진행할 수 없습니다."),

    // Common
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),

    // File
    FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "파일 업로드에 실패했습니다."),
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "허용되지 않는 파일 형식입니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    PASSWORD_MISMATCH(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다."),
    SAME_AS_OLD_PASSWORD(HttpStatus.BAD_REQUEST, "기존 비밀번호와 동일합니다."),

    // Survey
    SURVEY_INCOMPLETE(HttpStatus.BAD_REQUEST, "모든 문항에 응답해주세요."),
    SURVEY_QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "설문 문항을 찾을 수 없습니다."),

    // Place
    PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다."),
    PLACE_ALREADY_BOOKMARKED(HttpStatus.CONFLICT, "이미 보관함에 등록된 장소입니다."),
    PLACE_SEARCH_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "장소 검색 서비스가 일시적으로 불안정합니다."),

    // Schedule
    SCHEDULE_NOT_FOUND(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."),
    SCHEDULE_TIME_INVALID(HttpStatus.BAD_REQUEST, "시작 시각이 종료 시각보다 늦을 수 없습니다."),
    SCHEDULE_OUT_OF_PERIOD(HttpStatus.BAD_REQUEST, "여행 기간을 벗어난 일자입니다."),
    DIRECTIONS_FETCH_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "길찾기 정보를 불러오지 못했습니다."),

    // Vote
    VOTE_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "투표 세션을 찾을 수 없습니다."),
    VOTE_CANDIDATE_NOT_FOUND(HttpStatus.NOT_FOUND, "투표 후보를 찾을 수 없습니다."),
    VOTE_ALREADY_CLOSED(HttpStatus.BAD_REQUEST, "이미 마감된 투표입니다."),
    VOTE_SCORE_INVALID(HttpStatus.BAD_REQUEST, "투표 점수는 1~5 사이여야 합니다.");

    /**
     * HTTP 응답 상태코드
     *  auth(UNAUTHORIZED) = 401
     *  not found = 404
     *  bad request = 400
     */
    private final HttpStatus status;

    /**
     * 클라이언트에 전달하는 에러 메세지
     * ApiResponse.fail(message)에 들어감
     */
    private final String message;
}

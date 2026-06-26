import LegalLayout, { LegalSection } from './LegalLayout';

/**
 * 개인정보처리방침 (공개). 「개인정보 보호법」상 공개 의무 문서.
 * ⚠️ 운영자 정보·시행일 등 (___) 표기는 실제 값으로 채워야 하며, 정식 서비스 전 법률 검토 권장.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="개인정보처리방침" effectiveDate="2026-06-26">
      <p>
        GrouTrip 편돌즈(이하 “서비스”)는 「개인정보 보호법」 등 관계 법령을 준수하며, 이용자의 개인정보를
        보호하기 위해 다음과 같은 처리방침을 둡니다.
      </p>

      <LegalSection heading="1. 수집하는 개인정보 항목">
        <ul className="list-disc space-y-1 pl-5">
          <li>소셜 로그인(Google·Kakao) 시: 이름(닉네임), 이메일, 프로필 식별자</li>
          <li>서비스 이용 중 생성: 여행 그룹·일정·보관 장소·지출/정산 내역·업로드 사진·여행 성향(설문) 등</li>
          <li>정산 받기 정보(선택 입력): 송금 링크, 계좌 정보 — <strong>암호화하여 저장</strong></li>
          <li>프로필 사진(선택)</li>
          <li>서비스 이용 과정에서 접속 로그, 기기·브라우저 정보가 자동 생성·수집될 수 있습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. 개인정보의 수집·이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별 및 로그인, 그룹 여행 협업 기능 제공</li>
          <li>정산 시 같은 그룹 멤버 간 정산 정보 표시</li>
          <li>목적지 기반 맞춤 여행지 추천</li>
          <li>서비스 운영·개선 및 문의 응대</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. 보유 및 이용 기간">
        <p>
          회원 탈퇴 시 수집된 개인정보를 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우
          해당 법령에서 정한 기간 동안 보관합니다.
        </p>
      </LegalSection>

      <LegalSection heading="4. 개인정보의 제3자 제공">
        <p>
          서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 <strong>정산 기능</strong>에서
          이용자가 직접 입력한 정산 정보(송금 링크·계좌)는 동의한 목적 범위 내에서 같은 그룹의 멤버에게
          표시됩니다.
        </p>
      </LegalSection>

      <LegalSection heading="5. 개인정보 처리의 위탁 및 국외 이전">
        <p>서비스는 원활한 기능 제공을 위해 다음 업무를 위탁·연동하고 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Amazon Web Services(AWS): 이미지·파일 저장(S3, 리전 ap-northeast-2)</li>
          <li>Google·Kakao: 소셜 로그인 인증</li>
          <li>Google Maps, Kakao, 한국관광공사(TourAPI): 장소 검색·길찾기·추천 기능 연동</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. 파기 절차 및 방법">
        <p>전자적 파일 형태의 개인정보는 복구·재생이 불가능한 방법으로 영구 삭제합니다.</p>
      </LegalSection>

      <LegalSection heading="7. 이용자 및 법정대리인의 권리와 행사 방법">
        <p>
          이용자는 언제든지 개인정보의 조회·수정·삭제·처리정지를 요구하거나 마이페이지에서 직접 회원 탈퇴할
          수 있습니다. 탈퇴 시 계정과 관련 데이터는 복구할 수 없습니다.
        </p>
      </LegalSection>

      <LegalSection heading="8. 개인정보의 안전성 확보 조치">
        <ul className="list-disc space-y-1 pl-5">
          <li>전송 구간 암호화(HTTPS/TLS)</li>
          <li>정산 계좌 등 민감 정보의 암호화 저장</li>
          <li>접근 권한 통제 및 최소 수집 원칙 적용</li>
        </ul>
      </LegalSection>

      <LegalSection heading="9. 결제·송금 비처리 고지">
        <p>
          본 서비스는 결제·송금을 직접 처리하지 않으며, 입력된 정산 정보는 멤버 간 표시 용도로만 사용됩니다.
          실제 송금은 이용자가 외부 금융 서비스를 통해 직접 수행하며, 서비스는 금전 거래의 당사자가 아닙니다.
        </p>
      </LegalSection>

      <LegalSection heading="10. 개인정보 보호책임자">
        <ul className="list-disc space-y-1 pl-5">
          <li>책임자: (운영자 성명 입력)</li>
          <li>연락처: (문의 이메일 입력)</li>
        </ul>
        <p>개인정보 관련 문의·불만·피해구제는 위 연락처로 접수해 주시기 바랍니다.</p>
      </LegalSection>

      <LegalSection heading="11. 고지의 의무">
        <p>
          본 방침의 내용 추가·삭제·수정이 있을 경우 시행 전 서비스 내 공지를 통해 안내합니다.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

import LegalLayout, { LegalSection } from './LegalLayout';

/**
 * 이용약관 (공개). ⚠️ 정식 서비스 전 운영자 정보 보강 및 법률 검토 권장.
 */
export default function TermsPage() {
  return (
    <LegalLayout title="이용약관" effectiveDate="2026-06-26">
      <LegalSection heading="제1조 (목적)">
        <p>
          본 약관은 GrouTrip 편돌즈(이하 “서비스”)가 제공하는 그룹 여행 계획·협업 서비스의 이용과 관련하여
          서비스와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </LegalSection>

      <LegalSection heading="제2조 (회원가입 및 계정)">
        <p>
          서비스는 소셜 로그인(Google·Kakao)을 통한 회원가입만 제공합니다. 이용자는 본인의 소셜 계정으로
          가입하며, 계정 관리 책임은 이용자에게 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제3조 (서비스의 내용)">
        <p>
          서비스는 여행 그룹 생성·초대, 일정/장소 계획, 장소 투표, 사진 공유, 지출 정산 정보 표시, 목적지 기반
          여행지 추천 등의 기능을 제공합니다. 서비스 내용은 운영상 필요에 따라 변경될 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제4조 (이용자의 의무 및 금지행위)">
        <ul className="list-disc space-y-1 pl-5">
          <li>타인의 권리·명예를 침해하거나 불법·음란·혐오 콘텐츠를 게시하는 행위</li>
          <li>서비스의 정상적 운영을 방해하거나 부정한 방법으로 접근하는 행위</li>
          <li>타인의 개인정보를 무단 수집·이용하는 행위</li>
        </ul>
      </LegalSection>

      <LegalSection heading="제5조 (정산 기능에 관한 면책)">
        <p>
          서비스의 정산 기능은 멤버 간 정산 금액과 이용자가 입력한 송금 수단(링크·계좌)을 <strong>표시</strong>하는
          기능일 뿐이며, 서비스는 결제·송금을 직접 처리하지 않습니다. 실제 금전 송금은 이용자가 외부 금융
          서비스를 통해 직접 수행하며, 멤버 간 금전 거래·분쟁에 대해 서비스는 당사자가 아니고 책임을 지지
          않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제6조 (게시물·콘텐츠)">
        <p>
          이용자가 작성·업로드한 콘텐츠(일정·사진·메모 등)의 권리와 책임은 이용자에게 있습니다. 회원 탈퇴 또는
          그룹 해체 시 관련 콘텐츠는 삭제될 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제7조 (외부 서비스 연동)">
        <p>
          장소 검색·지도·길찾기·여행지 추천은 Google, Kakao, 한국관광공사(TourAPI) 등 외부 서비스의 데이터를
          연동해 제공합니다. 외부 데이터의 정확성·가용성은 해당 제공자의 정책에 따르며 서비스가 보증하지
          않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제8조 (서비스의 변경·중단)">
        <p>
          서비스는 운영·기술상의 필요에 따라 서비스의 전부 또는 일부를 변경·중단할 수 있으며, 중대한 변경 시
          사전 공지합니다.
        </p>
      </LegalSection>

      <LegalSection heading="제9조 (면책)">
        <p>
          천재지변, 외부 서비스 장애 등 서비스의 합리적 통제를 벗어난 사유로 발생한 손해에 대해 서비스는 책임을
          지지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="부칙">
        <p>본 약관은 시행일부터 적용됩니다.</p>
      </LegalSection>
    </LegalLayout>
  );
}

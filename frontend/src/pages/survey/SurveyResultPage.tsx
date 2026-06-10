import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { getMyPreference } from '../../api/survey';
import type { UserPreference } from '../../types/survey';

const DIMENSION_LABELS: { key: keyof UserPreference; label: string }[] = [
  { key: 'activity', label: '액티비티' },
  { key: 'food', label: '맛집' },
  { key: 'pace', label: '계획성' },
  { key: 'urbanNature', label: '도시/자연' },
  { key: 'timePref', label: '시간대' },
];

const DESCRIPTIONS: Record<keyof UserPreference, (percent: number) => string> = {
  activity: (p) => `당신은 액티비티 ${p}%형 여행자입니다.`,
  food: (p) => `당신의 맛집 탐방 욕구는 ${p}%입니다.`,
  pace: (p) => `당신의 계획적인 여행 선호도는 ${p}%입니다.`,
  urbanNature: (p) => `당신의 도시 선호도는 ${p}%입니다. (낮을수록 자연 선호)`,
  timePref: (p) => `당신의 아침형 여행 선호도는 ${p}%입니다. (낮을수록 야행성)`,
};

export default function SurveyResultPage() {
  const navigate = useNavigate();
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPreference = async () => {
      try {
        const data = await getMyPreference();
        setPreference(data);
      } catch {
        setError('성향 결과를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreference();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (error || !preference) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-400">{error || '결과가 없습니다.'}</p>
        <button
          onClick={() => navigate('/survey')}
          className="px-6 py-3 bg-[#FF9F66] hover:bg-[#f08c52] text-white font-semibold rounded-xl transition-colors"
        >
          설문하러 가기
        </button>
      </div>
    );
  }

  const chartData = DIMENSION_LABELS.map(({ key, label }) => ({
    dimension: label,
    value: Math.round(preference[key] * 100),
  }));

  return (
    <div className="min-h-screen bg-[#FFF8F0] p-4">
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">나의 여행 성향</h1>
        <p className="text-sm text-gray-400 mb-6">설문 결과를 바탕으로 한 여행 성향이에요</p>

        <div className="bg-white rounded-3xl shadow-lg shadow-orange-50 p-6 mb-4">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="성향"
                dataKey="value"
                stroke="#FF9F66"
                fill="#FF9F66"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-3xl shadow-lg shadow-orange-50 p-6 space-y-3 mb-6">
          {DIMENSION_LABELS.map(({ key }) => {
            const percent = Math.round(preference[key] * 100);
            return (
              <p key={key} className="text-sm text-gray-700">
                {DESCRIPTIONS[key](percent)}
              </p>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/survey')}
            className="flex-1 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            재설문하기
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3.5 bg-[#FF9F66] hover:bg-[#f08c52] text-white font-semibold rounded-xl transition-colors"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}

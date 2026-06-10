import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { getQuestions, submitSurvey } from '../../api/survey';
import type { ApiResponse } from '../../types/auth';
import type { SurveyQuestion } from '../../types/survey';

const SCORE_OPTIONS = [1, 2, 3, 4, 5];

export default function SurveyPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await getQuestions();
        setQuestions(data);
      } catch {
        setError('설문 문항을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleSelect = (questionId: number, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  const isComplete = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!isComplete) return;

    setError('');
    setIsSubmitting(true);

    try {
      await submitSurvey({
        answers: Object.entries(answers).map(([questionId, score]) => ({
          questionId: Number(questionId),
          score,
        })),
      });
      navigate('/survey/result');
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      setError(axiosError.response?.data?.message ?? '설문 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">여행 성향 설문</h1>
            <p className="text-sm text-gray-400 mt-1">12개 문항에 모두 응답해주세요</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            나중에
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 rounded-xl mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-3xl shadow-lg shadow-orange-50 p-6">
              <p className="text-sm font-medium text-gray-700 mb-4">
                {index + 1}. {question.content}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-300 whitespace-nowrap">전혀 아니다</span>
                <div className="flex gap-3">
                  {SCORE_OPTIONS.map((score) => (
                    <label key={score} className="flex flex-col items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={score}
                        checked={answers[question.id] === score}
                        onChange={() => handleSelect(question.id, score)}
                        className="w-5 h-5 accent-[#FF9F66] cursor-pointer"
                      />
                      <span className="text-xs text-gray-400">{score}</span>
                    </label>
                  ))}
                </div>
                <span className="text-xs text-gray-300 whitespace-nowrap">매우 그렇다</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className="w-full mt-6 py-3.5 bg-[#FF9F66] hover:bg-[#f08c52] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '제출 중...' : '제출하기'}
        </button>
      </div>
    </div>
  );
}

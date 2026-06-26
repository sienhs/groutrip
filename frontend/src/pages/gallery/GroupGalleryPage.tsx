import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { ConfirmModal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { getGroupPhotos, uploadGroupPhoto, deleteGroupPhoto, fetchPhotoObjectUrl, type GroupPhoto } from '../../api/gallery';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';

const MAX_PHOTOS = 30;

/** 그룹 사진 갤러리 — 멤버 누구나 업로드(최대 30장), 삭제는 업로더/Owner. 이미지는 인증 blob으로 표시. */
export default function GroupGalleryPage({
  groupId,
  currentUserId,
  isOwner,
}: {
  groupId: number;
  currentUserId: number;
  isOwner: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<GroupPhoto | null>(null);

  const { data: photos = [], isLoading, isError, refetch } = useQuery({
    queryKey: groupQueryKeys.photos(groupId),
    queryFn: () => getGroupPhotos(groupId),
  });
  const status: 'loading' | 'done' | 'error' = isLoading ? 'loading' : isError ? 'error' : 'done';
  const load = () => { void refetch(); };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadGroupPhoto(groupId, file),
    onSuccess: () => {
      toast.success('사진을 올렸어요');
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.photos(groupId) });
    },
    onError: (err) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error('업로드에 실패했어요', message ?? '5MB 이하 이미지인지 확인해 주세요.');
    },
  });
  const uploading = uploadMutation.isPending;

  const deleteMutation = useMutation({
    mutationFn: (photo: GroupPhoto) => deleteGroupPhoto(groupId, photo.id),
    onSuccess: () => {
      toast.success('사진을 삭제했어요');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.photos(groupId) });
    },
    onError: () => toast.error('삭제에 실패했어요', '권한이 없거나 일시적 오류일 수 있어요.'),
  });
  const delLoading = deleteMutation.isPending;

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.error('더 올릴 수 없어요', `사진은 그룹당 최대 ${MAX_PHOTOS}장까지예요.`);
      return;
    }
    uploadMutation.mutate(file);
  };

  const confirmDelete = () => { if (deleting) deleteMutation.mutate(deleting); };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] text-muted">{status === 'done' ? `${photos.length} / ${MAX_PHOTOS}장` : '사진'}</span>
        <Button size="sm" loading={uploading} disabled={photos.length >= MAX_PHOTOS} onClick={() => fileRef.current?.click()}>
          + 사진 올리기
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>

      {status === 'loading' && <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>}

      {status === 'error' && (
        <EmptyState title="사진을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요."
          action={<Button variant="secondary" onClick={load}>다시 시도</Button>} />
      )}

      {status === 'done' && photos.length === 0 && (
        <EmptyState title="아직 사진이 없어요" description="여행의 순간을 담은 사진을 올려보세요." />
      )}

      {status === 'done' && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <GalleryThumb
              key={p.id}
              photo={p}
              canDelete={isOwner || p.uploadedById === currentUserId}
              onOpen={setViewer}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </div>
      )}

      {/* 라이트박스 */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setViewer(null)}>
          <img src={viewer} alt="사진 크게 보기" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        </div>
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={delLoading}
        danger
        title="사진을 삭제할까요?"
        confirmText="삭제"
      />
    </div>
  );
}

/** 인증 blob으로 썸네일을 로드하고, 열기/삭제를 제공. */
function GalleryThumb({
  photo,
  canDelete,
  onOpen,
  onDelete,
}: {
  photo: GroupPhoto;
  canDelete: boolean;
  onOpen: (url: string) => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    fetchPhotoObjectUrl(photo.imageUrl)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        revoked = u;
        setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [photo.imageUrl]);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-[10px] bg-[#EFEDF7]">
      {url ? (
        <button type="button" onClick={() => onOpen(url)} className="h-full w-full">
          <img src={url} alt={`${photo.uploadedByName}님의 사진`} className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className="h-full w-full animate-pulse bg-[#EEECF6]" />
      )}
      {canDelete && (
        <button
          type="button"
          aria-label="삭제"
          onClick={onDelete}
          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

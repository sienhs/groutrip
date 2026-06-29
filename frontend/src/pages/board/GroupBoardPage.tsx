import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPosts, getPost, createPost, updatePost, deletePost, createComment, deleteComment } from '../../api/board';
import { pinNotice } from '../../api/group';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import useAuthStore from '../../store/authStore';
import { useToast } from '../../components/Toast';
import type { PostDetail, PostSummary } from '../../types/board';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';
import { SkeletonCard } from '../../components/Skeleton';
import ShoppingListCard from '../../components/ShoppingListCard';

interface Props {
  groupId: number;
  currentUserId: number;
  isOwner: boolean;
  /** 지정 시 목록이 아니라 해당 글 상세로 바로 진입(상단 고정 공지 클릭 등). */
  initialPostId?: number | null;
}

// ── 읽은 공지 ID를 localStorage에서 관리 ──────────────────────────────────────

function readNoticeKey(groupId: number, userId: number) {
  return `groutrip_read_notices_${groupId}_${userId}`;
}

export function getReadNoticeIds(groupId: number, userId: number): Set<number> {
  try {
    const raw = localStorage.getItem(readNoticeKey(groupId, userId));
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

export function markNoticesRead(groupId: number, userId: number, ids: number[]) {
  try {
    const existing = getReadNoticeIds(groupId, userId);
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(readNoticeKey(groupId, userId), JSON.stringify([...existing]));
  } catch {
    // ignore
  }
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function GroupBoardPage({ groupId, currentUserId, isOwner, initialPostId = null }: Props) {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(initialPostId);
  const [composing, setComposing] = useState(false);

  // 게시판 탭이 마운트되면 현재 공지를 모두 읽음 처리
  const postsQuery = useQuery({
    queryKey: groupQueryKeys.posts(groupId),
    queryFn: () => getPosts(groupId),
  });

  useEffect(() => {
    const notices = (postsQuery.data ?? []).filter((p) => p.isNotice).map((p) => p.id);
    if (notices.length > 0) {
      markNoticesRead(groupId, currentUserId, notices);
    }
  }, [postsQuery.data, groupId, currentUserId]);

  if (composing) {
    return (
      <PostCompose
        groupId={groupId}
        isOwner={isOwner}
        onDone={() => setComposing(false)}
        onCancel={() => setComposing(false)}
      />
    );
  }

  if (selectedPostId != null) {
    return (
      <PostDetailView
        groupId={groupId}
        postId={selectedPostId}
        isOwner={isOwner}
        onBack={() => setSelectedPostId(null)}
      />
    );
  }

  return (
    <div>
      <ShoppingListCard groupId={groupId} currentUserId={currentUserId} isOwner={isOwner} />
      <PostList
        posts={postsQuery.data ?? []}
        loading={postsQuery.isLoading}
        onSelectPost={setSelectedPostId}
        onNewPost={() => setComposing(true)}
      />
    </div>
  );
}

// ─── Post List ───────────────────────────────────────────────────────────────

function PostList({
  posts,
  loading,
  onSelectPost,
  onNewPost,
}: {
  posts: PostSummary[];
  loading: boolean;
  onSelectPost: (id: number) => void;
  onNewPost: () => void;
}) {
  if (loading) {
    return <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>;
  }

  const notices = posts.filter((p) => p.isNotice);
  const regular = posts.filter((p) => !p.isNotice);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold">게시판</h2>
        <Button size="sm" onClick={onNewPost}>글쓰기</Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState title="게시글이 없어요" description="첫 번째 글을 남겨보세요." />
      ) : (
        <div className="space-y-2">
          {/* 공지 먼저 */}
          {notices.map((p) => <PostRow key={p.id} post={p} onClick={() => onSelectPost(p.id)} />)}
          {/* 구분선 */}
          {notices.length > 0 && regular.length > 0 && (
            <div className="my-1 border-t border-dashed border-border" />
          )}
          {regular.map((p) => <PostRow key={p.id} post={p} onClick={() => onSelectPost(p.id)} />)}
        </div>
      )}
    </div>
  );
}

function PostRow({ post, onClick }: { post: PostSummary; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-card border border-border bg-surface px-4 py-3.5 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {post.isNotice && (
            <span className="shrink-0 rounded-full bg-[#C25478] px-2 py-0.5 text-[10px] font-extrabold text-white">
              공지
            </span>
          )}
          <span className="line-clamp-1 text-[15px] font-bold text-foreground">{post.title}</span>
        </div>
        <span className="shrink-0 text-[12px] text-muted">댓글 {post.commentCount}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
        <span>{post.authorName}</span>
        <span>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
      </div>
    </button>
  );
}

// ─── Post Detail ─────────────────────────────────────────────────────────────

function PostDetailView({
  groupId,
  postId,
  isOwner,
  onBack,
}: {
  groupId: number;
  postId: number;
  isOwner: boolean;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const [commentInput, setCommentInput] = useState('');
  const [editing, setEditing] = useState(false);

  const postQuery = useQuery({
    queryKey: ['board', groupId, postId],
    queryFn: () => getPost(groupId, postId),
  });

  const deleteMut = useMutation({
    mutationFn: () => deletePost(groupId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupQueryKeys.posts(groupId) });
      onBack();
    },
  });

  const addCommentMut = useMutation({
    mutationFn: (content: string) => createComment(groupId, postId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', groupId, postId] });
      qc.invalidateQueries({ queryKey: groupQueryKeys.posts(groupId) });
      setCommentInput('');
    },
  });

  const deleteCommentMut = useMutation({
    mutationFn: (commentId: number) => deleteComment(groupId, postId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', groupId, postId] });
      qc.invalidateQueries({ queryKey: groupQueryKeys.posts(groupId) });
    },
  });

  if (postQuery.isLoading) return <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>;

  const post: PostDetail | undefined = postQuery.data;
  if (!post) return null;

  if (editing) {
    return (
      <PostCompose
        groupId={groupId}
        isOwner={isOwner}
        initial={{ title: post.title, content: post.content, isNotice: post.isNotice }}
        postId={postId}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ['board', groupId, postId] });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const isAuthor = post.authorId === currentUser?.id;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-[13px] font-semibold text-muted"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        목록으로
      </button>

      <div className="rounded-card border border-border bg-surface p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {post.isNotice && (
              <span className="mt-0.5 shrink-0 rounded-full bg-[#C25478] px-2 py-0.5 text-[10px] font-extrabold text-white">
                공지
              </span>
            )}
            <h2 className="text-[17px] font-extrabold leading-snug">{post.title}</h2>
          </div>
          <div className="flex shrink-0 gap-2">
            {/* 방장만: 이 글을 채팅 상단 공지로 고정 */}
            {isOwner && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await pinNotice(groupId, { type: 'POST', refId: postId, title: post.title });
                    toast.success('채팅 상단에 고정했어요', '');
                  } catch {
                    toast.error('고정하지 못했어요', '잠시 후 다시 시도해 주세요.');
                  }
                }}
                className="text-[12px] font-semibold text-[#C25478] hover:opacity-80"
              >
                📌 고정
              </button>
            )}
            {isAuthor && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[12px] font-semibold text-muted hover:text-foreground"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate()}
                  className="text-[12px] font-semibold text-danger hover:opacity-80"
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mb-3 text-[12px] text-muted">
          {post.authorName} · {new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </div>
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{post.content}</p>
      </div>

      {/* 댓글 */}
      <div className="mt-4">
        <h3 className="mb-2 text-[13px] font-bold text-muted">댓글 {post.commentCount}</h3>
        <div className="space-y-2">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 rounded-card border border-border bg-surface px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold">{c.authorName}</span>
                  <span className="text-[11px] text-muted">
                    {new Date(c.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">{c.content}</p>
              </div>
              {c.authorId === currentUser?.id && (
                <button
                  type="button"
                  onClick={() => deleteCommentMut.mutate(c.id)}
                  className="shrink-0 text-[11px] text-muted hover:text-danger"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (commentInput.trim()) addCommentMut.mutate(commentInput.trim());
              }
            }}
            placeholder="댓글을 입력하세요"
            maxLength={1000}
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-[13px] outline-none focus:border-[#C25478]"
          />
          <Button
            size="sm"
            disabled={!commentInput.trim() || addCommentMut.isPending}
            onClick={() => { if (commentInput.trim()) addCommentMut.mutate(commentInput.trim()); }}
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Compose / Edit ─────────────────────────────────────────────────────

function PostCompose({
  groupId,
  postId,
  isOwner,
  initial,
  onDone,
  onCancel,
}: {
  groupId: number;
  postId?: number;
  isOwner: boolean;
  initial?: { title: string; content: string; isNotice: boolean };
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [isNotice, setIsNotice] = useState(initial?.isNotice ?? false);

  const saveMut = useMutation({
    mutationFn: () =>
      postId != null
        ? updatePost(groupId, postId, title.trim(), content.trim(), isNotice)
        : createPost(groupId, title.trim(), content.trim(), isNotice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupQueryKeys.posts(groupId) });
      onDone();
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold">{postId ? '글 수정' : '새 글 작성'}</h2>
        <button type="button" onClick={onCancel} className="text-[13px] text-muted hover:text-foreground">
          취소
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        maxLength={200}
        className="mb-3 w-full rounded-card border border-border bg-surface px-4 py-3 text-[15px] font-bold outline-none focus:border-[#C25478]"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요"
        rows={10}
        className="scrollbar-hide w-full resize-none rounded-card border border-border bg-surface px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-[#C25478]"
      />
      {/* 공지 체크박스 — Owner만 표시 */}
      {isOwner && (
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <span
            className={`flex size-5 items-center justify-center rounded border-2 transition-colors ${
              isNotice ? 'border-[#C25478] bg-[#C25478]' : 'border-border bg-surface'
            }`}
            onClick={() => setIsNotice((v) => !v)}
          >
            {isNotice && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={isNotice}
            onChange={(e) => setIsNotice(e.target.checked)}
          />
          <span className="text-[13px] font-semibold text-foreground">공지사항으로 등록</span>
          <span className="text-[12px] text-muted">게시판 최상단에 고정돼요</span>
        </label>
      )}
      <div className="mt-3">
        <Button
          fullWidth
          disabled={!title.trim() || !content.trim() || saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          {postId ? '수정 완료' : '등록'}
        </Button>
      </div>
    </div>
  );
}

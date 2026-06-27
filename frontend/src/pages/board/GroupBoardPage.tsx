import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPosts, getPost, createPost, updatePost, deletePost, createComment, deleteComment } from '../../api/board';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import useAuthStore from '../../store/authStore';
import type { PostDetail, PostSummary } from '../../types/board';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';
import { SkeletonCard } from '../../components/Skeleton';

interface Props {
  groupId: number;
}

export default function GroupBoardPage({ groupId }: Props) {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);

  if (composing) {
    return (
      <PostCompose
        groupId={groupId}
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
        onBack={() => setSelectedPostId(null)}
      />
    );
  }

  return (
    <PostList
      groupId={groupId}
      onSelectPost={setSelectedPostId}
      onNewPost={() => setComposing(true)}
    />
  );
}

// ─── Post List ───────────────────────────────────────────────────────────────

function PostList({
  groupId,
  onSelectPost,
  onNewPost,
}: {
  groupId: number;
  onSelectPost: (id: number) => void;
  onNewPost: () => void;
}) {
  const postsQuery = useQuery({
    queryKey: groupQueryKeys.posts(groupId),
    queryFn: () => getPosts(groupId),
  });

  if (postsQuery.isLoading) {
    return <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>;
  }

  const posts: PostSummary[] = postsQuery.data ?? [];

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
          {posts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPost(p.id)}
              className="w-full rounded-card border border-border bg-surface px-4 py-3.5 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-1 flex-1 text-[15px] font-bold text-foreground">{p.title}</span>
                <span className="shrink-0 text-[12px] text-muted">댓글 {p.commentCount}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
                <span>{p.authorName}</span>
                <span>·</span>
                <span>{new Date(p.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Detail ─────────────────────────────────────────────────────────────

function PostDetailView({
  groupId,
  postId,
  onBack,
}: {
  groupId: number;
  postId: number;
  onBack: () => void;
}) {
  const qc = useQueryClient();
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
        initial={{ title: post.title, content: post.content }}
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
          <h2 className="text-[17px] font-extrabold leading-snug">{post.title}</h2>
          {isAuthor && (
            <div className="flex shrink-0 gap-1">
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
            </div>
          )}
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

        {/* 댓글 입력 */}
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
  initial,
  onDone,
  onCancel,
}: {
  groupId: number;
  postId?: number;
  initial?: { title: string; content: string };
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');

  const saveMut = useMutation({
    mutationFn: () =>
      postId != null
        ? updatePost(groupId, postId, title.trim(), content.trim())
        : createPost(groupId, title.trim(), content.trim()),
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

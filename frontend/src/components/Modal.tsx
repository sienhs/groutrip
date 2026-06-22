import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { cn } from '../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** 하단 액션 영역. 미지정 시 footer 없음. */
  footer?: ReactNode;
  /** 좌상단 아이콘 배지 (Confirm 패턴용) */
  icon?: ReactNode;
  /** 배경 클릭으로 닫기 허용 (기본 true) */
  dismissable?: boolean;
}

/**
 * 공통 모달(Form / Confirm 공용 베이스).
 * Esc·배경 클릭으로 닫기, body 스크롤 잠금, role=dialog + aria-modal, 진입 애니메이션.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  icon,
  dismissable = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
      onClick={() => dismissable && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl outline-none"
      >
        {icon && <div className="mb-3.5">{icon}</div>}
        {title && <h2 className="text-lg font-extrabold text-[#3A322B]">{title}</h2>}
        {description && (
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
        )}
        {children && <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>}
        {footer && <div className="mt-6 flex gap-2.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 위험 액션(탈퇴/삭제 등)이면 confirm 버튼을 danger 로 */
  danger?: boolean;
  loading?: boolean;
}

/** 확인 모달(취소/확인 2버튼). 위험 액션은 danger 로. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  danger = false,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon={
        danger ? (
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#FEE2E2]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3 2 20h20L12 3Z" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 10v4M12 17v.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        ) : undefined
      }
      footer={
        <>
          <Button variant="ghost" fullWidth onClick={onClose} className="border border-border">
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            fullWidth
            loading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    />
  );
}

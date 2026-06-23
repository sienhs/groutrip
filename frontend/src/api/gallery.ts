import instance from './instance';
import type { ApiResponse } from '../types/auth';

/** 그룹 사진 갤러리(백엔드 Part A, DB 저장). 이미지는 인증 필요 → blob fetch로 표시. */
export interface GroupPhoto {
  id: number;
  uploadedById: number;
  uploadedByName: string;
  /** 인증 조회 경로(/image). <img src> 대신 fetchPhotoObjectUrl로 표시. */
  imageUrl: string;
  createdAt: string;
}

export const getGroupPhotos = async (groupId: number): Promise<GroupPhoto[]> => {
  const res = await instance.get<ApiResponse<GroupPhoto[]>>(`/api/groups/${groupId}/photos`);
  return res.data.data;
};

export const uploadGroupPhoto = async (groupId: number, file: File): Promise<GroupPhoto> => {
  const form = new FormData();
  form.append('photo', file);
  const res = await instance.post<ApiResponse<GroupPhoto>>(`/api/groups/${groupId}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};

export const deleteGroupPhoto = async (groupId: number, photoId: number): Promise<void> => {
  await instance.delete<ApiResponse<null>>(`/api/groups/${groupId}/photos/${photoId}`);
};

/** 인증 포함 blob으로 받아 object URL로 변환(<img src> 헤더 미지원 회피). 사용 후 revokeObjectURL 권장. */
export const fetchPhotoObjectUrl = async (imageUrl: string): Promise<string> => {
  const res = await instance.get(imageUrl, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
};

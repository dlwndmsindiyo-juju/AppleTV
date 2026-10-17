import { create } from "zustand";

export const useAuthStore = create((set)=>({
    // 사용자 정보를 저장할 변수
    user:null,
}))
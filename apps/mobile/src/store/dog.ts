import { create } from 'zustand';
import type { Dog, ELIState } from '@emopet/shared';

interface DogState {
  dogs: Dog[];
  selectedDogId: string | null;
  latestEli: Record<string, ELIState>;
  setDogs: (dogs: Dog[]) => void;
  selectDog: (id: string) => void;
  updateEli: (dogId: string, eli: ELIState) => void;
}

export const useDogStore = create<DogState>((set) => ({
  dogs: [],
  selectedDogId: null,
  latestEli: {},
  setDogs: (dogs) => set({ dogs, selectedDogId: dogs[0]?.id ?? null }),
  selectDog: (id) => set({ selectedDogId: id }),
  updateEli: (dogId, eli) =>
    set((state) => ({
      latestEli: { ...state.latestEli, [dogId]: eli },
    })),
}));

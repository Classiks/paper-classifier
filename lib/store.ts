import { create } from 'zustand';
import { z } from 'zod';
import { 
  CodingSchema, 
  CodingResult as ImportedCodingResult
} from './api';

// Export the schema for other components that need it
export const codingSchema = CodingSchema;
export type CodingResult = ImportedCodingResult;

export type Paper = {
    id: string;
    paperId?: string;
    title: string;
    abstract: string;
    coding?: CodingResult;
    isLoading?: boolean;
};

interface PaperStore {
    papers: Paper[];
    addPaper: () => void;
    addPaperWithContent: (title: string, abstract: string, paperId?: string) => string;
    removePaper: (id: string) => void;
    clearPapers: () => void;
    updatePaper: (id: string, paper: Partial<Paper>) => void;
    setCoding: (id: string, coding: CodingResult) => void;
    clearCoding: (id: string) => void;
    clearAllCodings: () => void;
    setLoading: (id: string, isLoading: boolean) => void;
}

export const usePaperStore = create<PaperStore>((set) => ({
    papers: [{ id: crypto.randomUUID(), title: '', abstract: '' }],
    addPaper: () => set((state) => ({ 
        papers: [...state.papers, { id: crypto.randomUUID(), title: '', abstract: '' }]
    })),
    addPaperWithContent: (title, abstract, paperId) => {
        const id = crypto.randomUUID();
        set((state) => ({
            papers: [...state.papers, { id, title, abstract, paperId }]
        }));
        return id;
    },
    removePaper: (id) => set((state) => {
        const filteredPapers = state.papers.filter((p) => p.id !== id);
        return {
            papers: filteredPapers.length === 0 
                ? [{ id: crypto.randomUUID(), title: '', abstract: '' }] 
                : filteredPapers
        };
    }),
    clearPapers: () => set(() => ({
        papers: [{ id: crypto.randomUUID(), title: '', abstract: '' }]
    })),
    updatePaper: (id, paper) => set((state) => ({
        papers: state.papers.map((p) => (p.id === id ? { ...p, ...paper } : p))
    })),
    setCoding: (id, coding) => set((state) => ({
        papers: state.papers.map((p) => 
            p.id === id ? { ...p, coding, isLoading: false } : p
        )
    })),
    clearCoding: (id) => set((state) => ({
        papers: state.papers.map((p) => 
            p.id === id ? { ...p, coding: undefined } : p
        )
    })),
    clearAllCodings: () => set((state) => ({
        papers: state.papers.map((p) => ({ ...p, coding: undefined }))
    })),
    setLoading: (id, isLoading) => set((state) => ({
        papers: state.papers.map((p) => (p.id === id ? { ...p, isLoading } : p))
    })),
})) 
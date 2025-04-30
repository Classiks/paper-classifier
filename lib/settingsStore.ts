import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Model = 'gpt-4o' | 'gpt-4o-mini' | 'o4-mini';

interface ModelSettingsStore {
    model: Model;
    setModel: (model: Model) => void;
}

interface ApiKeyStore {
    apiKey: string;
    setApiKey: (key: string) => void;
}

export const useModelSettingsStore = create<ModelSettingsStore>()(
    persist(
        (set) => ({
            model: 'gpt-4o-mini' as Model,
            setModel: (model: Model) => set({ model }),
        }),
        {
            name: 'paper-classifier-model-settings',
        }
    )
);

export const useApiKeyStore = create<ApiKeyStore>()((set) => ({
    apiKey: "",
    setApiKey: (key: string) => set({ apiKey: key }),
})); 
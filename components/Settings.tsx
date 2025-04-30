import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useModelSettingsStore, useApiKeyStore } from "@/lib/settingsStore";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Settings() {
  const { model, setModel } = useModelSettingsStore();
  const { apiKey, setApiKey } = useApiKeyStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [temporaryApiKey, setTemporaryApiKey] = useState(apiKey);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTemporaryApiKey(e.target.value);
  };

  const handleApiKeyBlur = () => {
    if (temporaryApiKey !== apiKey) {
      setApiKey(temporaryApiKey);
    }
  };

  const handleModelChange = (value: string) => {
    setModel(value as 'gpt-4o-mini' | 'gpt-4o' | 'o4-mini');
  };

  return (
    <div className="mb-8 p-4 bg-muted rounded-md border space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Model</label>
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini">4o-mini (Fastest and Cheapest)</SelectItem>
              <SelectItem value="gpt-4o">4o (Fast and Reliable)</SelectItem>
              <SelectItem value="o4-mini">o4-mini (Reliable and Accurate)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">OpenAI API Key</label>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your OpenAI API key"
                value={temporaryApiKey}
                onChange={handleApiKeyChange}
                onBlur={handleApiKeyBlur}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
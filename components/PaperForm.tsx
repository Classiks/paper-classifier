import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { categorizePaper } from "@/lib/api";
import { usePaperStore } from "@/lib/store";
import { useForm } from "react-hook-form";

export function PaperForm() {
    const { papers, addPaper, removePaper, clearPapers, updatePaper, setCoding, setLoading } = usePaperStore();

    const form = useForm();

    const handleCategorize = async (paperId: string) => {
        const paper = papers.find((p) => p.id === paperId);
        if (!paper || !paper.title || !paper.abstract) return;

        setLoading(paperId, true);

        try {
            console.log("Sending paper to API:", { title: paper.title, abstract: paper.abstract });
            const result = await categorizePaper(paper.title, paper.abstract);
            console.log("API result:", result);
            
            // Check if the result is valid
            if (result && typeof result.include !== 'undefined') {
                setCoding(paperId, result);
                
                // Debug store state after setting
                setTimeout(() => {
                    const updatedPaper = usePaperStore.getState().papers.find(p => p.id === paperId);
                    console.log("Paper after coding update:", updatedPaper);
                }, 100);
            } else {
                console.error("Invalid API response format:", result);
                setLoading(paperId, false);
            }
        } catch (error) {
            console.error("Error coding paper:", error);
            setLoading(paperId, false);
        }
    };

    const handleClearAll = () => {
        if (confirm("Are you sure you want to remove all papers? This action cannot be undone.")) {
            clearPapers();
        }
    };

    return (
        <Form {...form}>
            <div className="space-y-6">
                {papers.map((paper) => (
                    <div
                        key={paper.id}
                        className="p-4 bg-muted rounded-md border space-y-4"
                    >
                        <div className="flex justify-between items-center gap-2">
                            <FormField
                                name={`paperId-${paper.id}`}
                                render={({ field }) => (
                                    <FormItem className="w-1/4">
                                        <FormLabel>ID</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Paper ID"
                                                value={paper.paperId || ''}
                                                onChange={(e) => updatePaper(paper.id, { paperId: e.target.value })}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                name={`title-${paper.id}`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Paper title"
                                                value={paper.title}
                                                onChange={(e) => updatePaper(paper.id, { title: e.target.value })}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="mt-8"
                                onClick={() => removePaper(paper.id)}
                                title="Remove paper"
                            >
                                Remove
                            </Button>
                        </div>

                        <FormField
                            name={`abstract-${paper.id}`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Abstract</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Paper abstract"
                                            rows={4}
                                            value={paper.abstract}
                                            onChange={(e) => updatePaper(paper.id, { abstract: e.target.value })}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end">
                            <Button
                                variant="default"
                                onClick={() => handleCategorize(paper.id)}
                                disabled={!paper.title || !paper.abstract || paper.isLoading}
                            >
                                {paper.isLoading ? "Analyzing..." : "Analyze"}
                            </Button>
                        </div>
                    </div>
                ))}
                
                <div className="flex gap-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={addPaper}
                    >
                        + Add Paper
                    </Button>
                    
                    {papers.length > 0 && (
                        <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={handleClearAll}
                        >
                            Clear All
                        </Button>
                    )}
                </div>
            </div>
        </Form>
    );
} 
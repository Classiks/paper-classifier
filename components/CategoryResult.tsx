import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaperStore } from "@/lib/store";
import { CodingResult, Paper } from "@/lib/store";
import { XCircle } from "lucide-react";

interface CategoryResultProps {
    paper: Paper;
}

// Helper function to display educational level
const getEducationalLevelLabel = (level: number): string => {
    switch (level) {
        case 1: return "K-12";
        case 2: return "Higher Education";
        case 3: return "Vocational";
        default: return `Unknown (${level})`;
    }
};

// Helper function to display research design
const getDesignLabel = (design: number): string => {
    switch (design) {
        case 1: return "Quantitative";
        case 2: return "Qualitative";
        case 3: return "Mixed-Methods";
        case 4: return "Review/Meta-Analysis";
        case 5: return "Theoretical";
        case 6: return "Descriptive/Report";
        default: return `Unknown (${design})`;
    }
};

// Helper function to format reason text
const formatReason = (group: string, clarification?: string): string => {
    if (clarification) {
        return `${clarification} ${group}`;
    }
    return group;
};

export function CategoryResult({ paper }: CategoryResultProps) {
    const { title, abstract, coding, id } = paper;
    const { clearCoding } = usePaperStore();

    if (!coding) return null;

    return (
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => clearCoding(id)}
                    className="h-8 w-8 p-0" 
                    title="Remove coding"
                >
                    <XCircle className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible>
                    <AccordionItem value="abstract">
                        <AccordionTrigger>Abstract</AccordionTrigger>
                        <AccordionContent>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{abstract}</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="mt-4">
                    <h3 className="text-md font-medium mb-2">Coding Results:</h3>

                    <div className="p-3 bg-muted rounded-md border mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <Badge variant={coding.include === 1 ? "default" : "destructive"} className="capitalize">
                                {coding.include === 1 ? "Include" : "Exclude"}
                            </Badge>
                            {coding._confidence && (
                                <span className="text-sm font-medium text-muted-foreground">
                                    Confidence: {coding._confidence}%
                                </span>
                            )}
                        </div>
                    </div>

                    {coding.include === 1 && (
                        <div className="space-y-3">
                            {/* Reasons */}
                            {coding.reason && coding.reason.length > 0 && (
                                <div className="p-3 bg-muted rounded-md border">
                                    <h4 className="text-sm font-medium mb-2">Reasons:</h4>
                                    <div className="space-y-1">
                                        {coding.reason.map((reason, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Badge variant="outline" className="capitalize">
                                                    {formatReason(reason.group, reason.clarification)}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Subjects */}
                            {coding.subject && coding.subject.length > 0 && (
                                <div className="p-3 bg-muted rounded-md border">
                                    <h4 className="text-sm font-medium mb-2">Subjects:</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {coding.subject.map((subject, idx) => (
                                            <Badge key={idx} variant="outline" className="capitalize">
                                                {subject}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Research Design */}
                            {coding.design && (
                                <div className="p-3 bg-muted rounded-md border">
                                    <h4 className="text-sm font-medium mb-2">Research Design:</h4>
                                    <Badge variant="outline">
                                        {getDesignLabel(coding.design)}
                                    </Badge>
                                </div>
                            )}

                            {/* Educational Level */}
                            {coding.educationalLevel && coding.educationalLevel.length > 0 && (
                                <div className="p-3 bg-muted rounded-md border">
                                    <h4 className="text-sm font-medium mb-2">Educational Level:</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {coding.educationalLevel.map((level, idx) => (
                                            <Badge key={idx} variant="outline">
                                                {getEducationalLevelLabel(level)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reasoning from AI (if provided) */}
                    {coding._reasoning && (
                        <div className="p-3 bg-muted rounded-md border mt-3">
                            <h4 className="text-sm font-medium mb-1">AI Reasoning:</h4>
                            <p className="text-sm text-muted-foreground">{coding._reasoning}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 
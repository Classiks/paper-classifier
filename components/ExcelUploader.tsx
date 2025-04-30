import { Button } from "@/components/ui/button";
import { usePaperStore } from "@/lib/store";
import { 
    CodingResult, 
    DesignEnum, 
    EducationalLevelEnum, 
    IncludeEnum, 
    ReasonDetail, 
    ReasonGroupEnum,
    ReasonClarificationEnum 
} from "@/lib/api";
import { Info } from "lucide-react";
import { useRef, useState } from "react";
import readXlsxFile from "read-excel-file";
import { z } from "zod";

interface ExcelRow {
    id: string;
    title: string;
    abstract: string;
    include?: number; // Include-C
    reason?: string;  // Reason-C
    discipline?: string; // Discipline-C
    design?: number;  // Design-C
    level?: string;   // Level-C
}

// Helper function to parse reason string into ReasonDetail array
const parseReasons = (reasonStr?: string): Array<z.infer<typeof ReasonDetail>> | undefined => {
    if (!reasonStr || reasonStr.trim() === '') return undefined;
    
    const reasons: Array<z.infer<typeof ReasonDetail>> = [];
    // Split by comma if there are multiple reasons
    const reasonParts = reasonStr.split(',').map(r => r.trim());
    
    for (const part of reasonParts) {
        // Try to extract group and clarification (if any)
        const match = part.match(/^([a-z]+)(?:\s+([a-z]+))?$/i);
        if (match) {
            const [, group, clarification] = match;
            
            // Validate group
            if (Object.values(ReasonGroupEnum.enum).includes(group as any)) {
                const reasonDetail: z.infer<typeof ReasonDetail> = {
                    group: group as any
                };
                
                // Add clarification if valid
                if (clarification && 
                    ['degree', 'career', 'course', 'enrollment'].includes(clarification)) {
                    reasonDetail.clarification = clarification as any;
                }
                
                reasons.push(reasonDetail);
            }
        }
    }
    
    return reasons.length > 0 ? reasons : undefined;
};

// Helper function to parse discipline string into string array
const parseDisciplines = (disciplineStr?: string): string[] | undefined => {
    if (!disciplineStr || disciplineStr.trim() === '') return undefined;
    
    // Split by comma if there are multiple disciplines
    const disciplines = disciplineStr.split(',').map(d => d.trim()).filter(Boolean);
    return disciplines.length > 0 ? disciplines : undefined;
};

// Helper function to parse education level string into number array
const parseEducationLevels = (levelStr?: string): Array<1 | 2 | 3> | undefined => {
    if (!levelStr || levelStr.trim() === '') return undefined;
    
    const levels: Array<1 | 2 | 3> = [];
    // Split by comma if there are multiple levels
    const levelParts = levelStr.split(',').map(l => l.trim());
    
    for (const part of levelParts) {
        const level = parseInt(part);
        if (!isNaN(level) && [1, 2, 3].includes(level)) {
            levels.push(level as 1 | 2 | 3);
        }
    }
    
    return levels.length > 0 ? levels : undefined;
};

export function ExcelUploader() {
    const { addPaperWithContent, updatePaper, clearPapers, setCoding } = usePaperStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsUploading(true);
        setErrorMessage(null);

        try {
            const rows = await readXlsxFile<ExcelRow>(file, {
                schema: {
                    'ID': {
                        prop: 'id',
                        type: String
                    },
                    'Article Title': {
                        prop: 'title',
                        type: String,
                        required: true
                    },
                    'Abstract': {
                        prop: 'abstract',
                        type: String,
                        required: true
                    },
                    'Include-C': {
                        prop: 'include',
                        type: Number
                    },
                    'Reason-C': {
                        prop: 'reason',
                        type: String
                    },
                    'Discipline-C': {
                        prop: 'discipline',
                        type: String
                    },
                    'Design-C': {
                        prop: 'design',
                        type: Number
                    },
                    'Level-C': {
                        prop: 'level',
                        type: String
                    }
                },
                sheet: 1 // The first sheet (1-indexed)
            });

            if (rows.errors && rows.errors.length > 0) {
                setErrorMessage(`Validation errors in Excel file: ${rows.errors.map(e => e.error).join(', ')}`);
                return;
            }

            if (rows.rows.length === 0) {
                setErrorMessage('No valid data found in the Excel file');
                return;
            }

            // Clear existing papers first
            clearPapers();
            
            // Then add all papers from Excel
            rows.rows.forEach((row, index) => {
                // Create paper ID for tracking in the app
                const paperId = row.id || `import-${index}`;
                
                // Prepare coding data if any exists
                let coding: CodingResult | undefined;
                
                if (typeof row.include === 'number') {
                    coding = {
                        include: row.include === 1 ? 1 : 0,
                    };
                    
                    // If included, add additional coding details if available
                    if (coding.include === 1) {
                        const reasons = parseReasons(row.reason);
                        if (reasons) coding.reason = reasons;
                        
                        const subjects = parseDisciplines(row.discipline);
                        if (subjects) coding.subject = subjects;
                        
                        if (row.design && [1, 2, 3, 4, 5, 6].includes(row.design)) {
                            coding.design = row.design as 1 | 2 | 3 | 4 | 5 | 6;
                        }
                        
                        const levels = parseEducationLevels(row.level);
                        if (levels) coding.educationalLevel = levels;
                    }
                }
                
                if (index === 0) {
                    // Update the first empty paper created by clearPapers()
                    const papers = usePaperStore.getState().papers;
                    const firstPaperId = papers[0].id;
                    updatePaper(firstPaperId, { 
                        title: row.title, 
                        abstract: row.abstract,
                        paperId
                    });
                    
                    // Set coding if available
                    if (coding) {
                        setCoding(firstPaperId, coding);
                    }
                } else {
                    // Add new papers with content
                    const newPaperId = addPaperWithContent(row.title, row.abstract, paperId);
                    
                    // Set coding if available
                    if (coding) {
                        setCoding(newPaperId, coding);
                    }
                }
            });

        } catch (error) {
            console.error("Error reading Excel file:", error);
            setErrorMessage('Error reading Excel file. Check the column headers match the expected format.');
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Import papers from Excel</h3>
                <div className="group relative cursor-help">
                    <Info size={14} className="text-muted-foreground" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black text-white text-xs rounded w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                        Excel file should have columns: "ID", "Article Title", "Abstract", "Include-C", "Reason-C", "Discipline-C", "Design-C", "Level-C".
                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                    </div>
                </div>
            </div>
            
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
            />
            <Button 
                type="button" 
                variant="outline" 
                onClick={handleClick}
                disabled={isUploading}
                className="w-full"
            >
                {isUploading ? "Uploading..." : fileName ? `Replace "${fileName}"` : "Import from Excel"}
            </Button>
            
            {errorMessage && (
                <div className="mt-2 text-sm text-red-500">
                    {errorMessage}
                </div>
            )}
        </div>
    );
} 
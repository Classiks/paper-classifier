import { Button } from "@/components/ui/button";
import { usePaperStore } from "@/lib/store";
import { Download } from "lucide-react";
import writeXlsxFile from "write-excel-file";

// Helper function to format reason text (copied from CategoryResult)
const formatReason = (group: string, clarification?: string): string => {
    if (clarification) {
        return `${clarification} ${group}`;
    }
    return group;
};

// Format reasons array to comma-separated string
const formatReasons = (reasons?: Array<{group?: string, clarification?: string}>): string => {
    if (!reasons || reasons.length === 0) return "";
    return reasons.map(reason => reason.group ? formatReason(reason.group, reason.clarification) : "").filter(Boolean).join(", ");
};

// Format array to comma-separated string
const formatArray = (arr?: string[] | number[]): string => {
    if (!arr || arr.length === 0) return "";
    return arr.join(", ");
};

export function ExcelExporter() {
    const { papers } = usePaperStore();

    const handleExport = async () => {
        // Create header row
        const headerRow = [
            { value: 'ID', fontWeight: 'bold' },
            { value: 'Article Title', fontWeight: 'bold' },
            { value: 'Abstract', fontWeight: 'bold' },
            { value: 'Include-C', fontWeight: 'bold' },
            { value: 'Reason-C', fontWeight: 'bold' },
            { value: 'Discipline-C', fontWeight: 'bold' },
            { value: 'Design-C', fontWeight: 'bold' },
            { value: 'Level-C', fontWeight: 'bold' },
            { value: 'AI_Confidence', fontWeight: 'bold' },
            { value: 'AI_Reasoning', fontWeight: 'bold' }
        ];

        // Create data rows
        const dataRows = papers.map(paper => [
            // ID
            {
                type: String,
                value: paper.paperId || paper.id || ''
            },
            // Article Title
            {
                type: String,
                value: paper.title
            },
            // Abstract
            {
                type: String,
                value: paper.abstract
            },
            // Include-C
            {
                type: Number,
                value: paper.coding?.include ?? null
            },
            // Reason-C
            {
                type: String,
                value: formatReasons(paper.coding?.reason)
            },
            // Discipline-C
            {
                type: String,
                value: formatArray(paper.coding?.subject)
            },
            // Design-C
            {
                type: Number,
                value: paper.coding?.design ?? null
            },
            // Level-C
            {
                type: String,
                value: formatArray(paper.coding?.educationalLevel)
            },
            // AI_Confidence
            {
                type: Number,
                value: paper.coding?._confidence ?? null
            },
            // AI_Reasoning
            {
                type: String,
                value: paper.coding?._reasoning || ''
            }
        ]);

        // Define column widths
        const columns = [
            { width: 15 }, // ID
            { width: 30 }, // Article Title
            { width: 50 }, // Abstract
            { width: 10 }, // Include-C
            { width: 20 }, // Reason-C
            { width: 20 }, // Discipline-C
            { width: 10 }, // Design-C
            { width: 15 }, // Level-C
            { width: 15 }, // AI_Confidence
            { width: 50 }  // AI_Reasoning
        ];

        // Combine header and data rows
        const data = [headerRow, ...dataRows];

        try {
            // @ts-expect-error: works (shrug)
            await writeXlsxFile(data, {
                columns,
                fileName: 'paper-classification-results.xlsx',
                sheet: 'Classification Results',
                stickyRowsCount: 1
            });
        } catch (error) {
            console.error("Error exporting Excel file:", error);
        }
    };

    return (
        <div>
            <div className="mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Export classification results</h3>
            </div>
            <Button 
                type="button" 
                variant="outline" 
                onClick={handleExport}
                className="w-full"
                disabled={papers.length === 0}
            >
                <Download size={16} className="mr-2" />
                Export to Excel
            </Button>
        </div>
    );
} 
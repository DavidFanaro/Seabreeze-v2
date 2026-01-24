/**
 * @file TableComponent.tsx
 * @purpose Render basic markdown tables with theming and copy support
 */

import React, { useMemo, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { useTheme } from "@/components/ui/ThemeProvider";
import { createMarkdownStyles } from "../styles";
import { formatTableForCopy } from "../utils";
import { CopyButton } from "./CopyButton";
import { MarkdownText } from "./MarkdownText";

interface TableComponentProps {
    headers: string[];
    rows: string[][];
}

export const TableComponent: React.FC<TableComponentProps> = ({ headers, rows }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const copyContent = useMemo(
        () => formatTableForCopy(headers, rows),
        [headers, rows]
    );

    const renderHeaderCell = useCallback(
        (header: string, index: number, isLast: boolean) => (
            <View
                key={index}
                style={[
                    styles.tableHeaderCell,
                    isLast && { borderRightWidth: 0 },
                ]}
            >
                <Text style={styles.tableHeaderCellText}>{header}</Text>
            </View>
        ),
        [styles]
    );

    const renderDataCell = useCallback(
        (cell: string, index: number, isLast: boolean) => (
            <View
                key={index}
                style={[
                    styles.tableCell,
                    isLast && { borderRightWidth: 0 },
                ]}
            >
                <MarkdownText content={cell} style={styles.tableCellText} />
            </View>
        ),
        [styles]
    );

    const renderRow = useCallback(
        (row: string[], rowIndex: number, isLastRow: boolean) => (
            <View
                key={rowIndex}
                style={[
                    styles.tableRow,
                    isLastRow && { borderBottomWidth: 0 },
                ]}
            >
                {row.map((cell, cellIndex) =>
                    renderDataCell(cell, cellIndex, cellIndex === row.length - 1)
                )}
            </View>
        ),
        [styles, renderDataCell]
    );

    return (
        <View style={{ marginVertical: 12 }}>
            {/* Copy button */}
            <View style={{ alignItems: "flex-end", marginBottom: 4 }}>
                <CopyButton content={copyContent} size={14} />
            </View>

            {/* Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.tableContainer}>
                    {/* Header row */}
                    <View style={styles.tableHeaderRow}>
                        {headers.map((header, index) =>
                            renderHeaderCell(header, index, index === headers.length - 1)
                        )}
                    </View>

                    {/* Data rows */}
                    {rows.map((row, rowIndex) =>
                        renderRow(row, rowIndex, rowIndex === rows.length - 1)
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

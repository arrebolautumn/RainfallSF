import { useEffect, useState } from "react";
import * as d3 from "d3";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet } from "lucide-react";
import csvUrl from "@/data/san_francisco_weather_data.csv?url";

type AnyRow = Record<string, string | number | null | undefined>;

export function DataExport() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await d3.csv(csvUrl);
        if (data.length > 0) {
          const keys = Object.keys(data[0]);

          setHeaders(keys);
          setRows(
            data.map((d) => {
              const obj: AnyRow = {};
              keys.forEach((k) => {
                const v = (d as AnyRow)[k];

                // 把空字符串当成缺失值
                if (v === "") {
                  obj[k] = null;
                } else {
                  obj[k] = v;
                }
              });
              return obj;
            })
          );
        }
      } catch (err) {
        console.error("Error loading CSV for export:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 统一的“安全格式化”，用于导出和预览
  const formatCell = (raw: AnyRow[string]): string => {
    if (
      raw === null ||
      raw === undefined ||
      raw === "" ||
      (typeof raw === "number" && Number.isNaN(raw))
    ) {
      // 你可以改成 "0"：return "0";
      return "NA";
    }
    return String(raw);
  };

  const handleExport = () => {
    if (!rows.length || !headers.length) return;

    const lines: string[] = [];

    // header
    lines.push(headers.join(","));

    // rows
    for (const row of rows) {
      const line = headers
        .map((key) => {
          const value = formatCell(row[key]);
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",");
      lines.push(line);
    }

    const blob = new Blob([lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "san_francisco_weather_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Export Dataset to CSV</CardTitle>
            <CardDescription>
              Export the historical weather data used by the current dashboard as
              a CSV file for further analysis in Excel/Python/R.
            </CardDescription>
          </div>
          <FileSpreadsheet className="h-8 w-8 text-primary" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline">
              {loading ? "Loading…" : `${rows.length.toLocaleString()} rows`}
            </Badge>
            {!loading && headers.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Columns: {headers.join(", ")}
              </span>
            )}
          </div>

          <Button
            onClick={handleExport}
            disabled={loading || !rows.length}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>

          {!loading && rows.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Data preview (first 20 rows)
              </div>
              <ScrollArea className="h-64 w-full rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-2 py-1 text-left font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t">
                        {headers.map((h) => (
                          <td key={h} className="px-2 py-1">
                            {formatCell(row[h])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

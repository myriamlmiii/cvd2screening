"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { CountryCell, Mark, StatusChip } from "@/components/erp/ui";
import type { PipelinePayload } from "@/lib/erp/payloads";
import { useLocale } from "@/lib/i18n";
import { formatAppDate } from "@/lib/dates";

type Row = PipelinePayload["rows"][number];

export function PipelineTable({ rows }: { rows: Row[] }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "select",
        header: () => <input type="checkbox" className="accent-[#2563EB]" aria-label={t("erp.pipeSelectAll")} />,
        cell: ({ row }) => <input type="checkbox" className="accent-[#2563EB]" aria-label={row.original.name} onClick={(e) => e.stopPropagation()} />,
      },
      {
        accessorKey: "name",
        header: t("erp.sitStartup"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Mark name={row.original.name} className="h-7 w-7" />
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "dateEntered",
        header: t("erp.pipeDateIn"),
        cell: ({ getValue }) => formatAppDate(getValue() as string | null, locale),
      },
      {
        id: "ask",
        header: t("erp.pipeAskValo"),
        cell: ({ row }) => [row.original.fundingSought, row.original.valuation].filter(Boolean).join(" / ") || "—",
      },
      {
        accessorKey: "description",
        header: t("erp.pipeDesc"),
        cell: ({ getValue }) => <span className="block max-w-[220px] truncate">{(getValue() as string) || "—"}</span>,
      },
      {
        accessorKey: "sector",
        header: t("erp.pipeSector"),
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? <StatusChip label={v} tone="blue" /> : "—";
        },
      },
      {
        accessorKey: "country",
        header: t("erp.country"),
        cell: ({ row }) => <CountryCell country={row.original.country} />,
      },
      {
        id: "pitch",
        header: t("erp.pipePitch"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.pitchUrl ? (
            <a href={row.original.pitchUrl} className="text-[13px] text-[#2563EB]" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              {t("erp.pipeSeePitch")}
            </a>
          ) : (
            <span className="text-ink-3">—</span>
          ),
      },
      {
        id: "fiche",
        header: t("erp.pipeFiche"),
        enableSorting: false,
        cell: ({ row }) => (
          <Link href={`/pipeline/${row.original.id}`} className="text-[13px] text-[#2563EB]" onClick={(e) => e.stopPropagation()}>
            {t("erp.pipeOpenFiche")}
          </Link>
        ),
      },
      {
        id: "more",
        enableSorting: false,
        cell: ({ row }) => (
          <Link href={`/pipeline/${row.original.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line" onClick={(e) => e.stopPropagation()}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ),
      },
    ],
    [t, locale],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const pageRows = table.getRowModel().rows;

  return (
    <section className="erp-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="erp-table w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className={h.column.getCanSort() ? "cursor-pointer select-none" : undefined} onClick={h.column.getToggleSortingHandler()}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-ink-3">
                  {t("erp.pipeEmpty")}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className="erp-row-link" onClick={() => router.push(`/pipeline/${row.original.id}`)}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12px] text-ink-3">
        <span>
          {t("erp.pipeShowing", {
            from: rows.length ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0,
            to: Math.min(rows.length, (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize),
            total: rows.length,
          })}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg border border-line px-2 py-1 disabled:opacity-40" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            ←
          </button>
          <span>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <button type="button" className="rounded-lg border border-line px-2 py-1 disabled:opacity-40" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            →
          </button>
          <select
            className="h-8 rounded-lg border border-line bg-white px-2"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[8, 25, 50].map((n) => (
              <option key={n} value={n}>
                {t("erp.pipePerPage", { n })}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

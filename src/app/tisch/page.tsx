"use client";

import { TableApp } from "@/components/table/TableApp";

export default function TischPage() {
  return (
    <div className="mx-auto max-w-xl">
      <TableApp
        header={(actions) => (
          <div className="mb-5 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold">Am Tisch spielen</h1>
              <p className="text-sm text-haze">Mit echten Zetteln. Die App zieht Buchstaben, stoppt die Zeit und zählt Punkte.</p>
            </div>
            {actions}
          </div>
        )}
      />
    </div>
  );
}

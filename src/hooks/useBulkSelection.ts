import { useCallback, useMemo, useState } from "react";

export function useBulkSelection<T extends { id: string }>(rows: T[] | undefined) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => (rows ?? []).map((r) => r.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((s) => {
      if (allIds.every((id) => s.has(id))) return new Set();
      return new Set(allIds);
    });
  }, [allIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggle, toggleAll, clear, allSelected, someSelected, count: selected.size };
}

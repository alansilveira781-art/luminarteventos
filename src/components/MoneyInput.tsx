import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onChange: (value: number) => void;
  /** Se true, deixa de mostrar o prefixo R$ dentro do input. */
  hidePrefix?: boolean;
};

const formatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function centsToText(cents: number): string {
  return formatter.format(cents / 100);
}

function digitsToCents(digits: string): number {
  if (!digits) return 0;
  const trimmed = digits.replace(/^0+/, "") || "0";
  return Number(trimmed);
}

function valueToCents(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.round(Number(value) * 100);
}

/**
 * Input monetário em R$ no formato "cents-as-you-type":
 * o usuário digita apenas dígitos e a vírgula fica fixa nas duas últimas casas.
 *
 * Ex.: digitar 12345 → exibe "123,45" → onChange(123.45).
 */
export function MoneyInput({
  value,
  onChange,
  hidePrefix,
  className,
  onPaste,
  onKeyDown,
  ...rest
}: Props) {
  const [digits, setDigits] = useState<string>(() => String(valueToCents(value)));
  const focused = useRef(false);

  // Mantém em sincronia quando o valor externo muda e o input não está focado.
  useEffect(() => {
    if (focused.current) return;
    const external = String(valueToCents(value));
    if (external !== digits) setDigits(external);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (nextDigits: string) => {
    setDigits(nextDigits);
    onChange(digitsToCents(nextDigits) / 100);
  };

  return (
    <div className="relative">
      {!hidePrefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
      )}
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        {...rest}
        className={cn(hidePrefix ? "text-right tabular-nums" : "pl-9 text-right tabular-nums", className)}
        value={centsToText(digitsToCents(digits))}
        onFocus={(e) => {
          focused.current = true;
          // Move o caret para o final no foco
          requestAnimationFrame(() => {
            const el = e.target as HTMLInputElement;
            const len = el.value.length;
            el.setSelectionRange(len, len);
          });
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          focused.current = false;
          rest.onBlur?.(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          // Navegação e atalhos passam direto
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          const k = e.key;
          if (k === "Tab" || k === "Enter" || k.startsWith("Arrow") || k === "Home" || k === "End") return;

          if (k === "Backspace" || k === "Delete") {
            e.preventDefault();
            emit(digits.slice(0, -1));
            return;
          }

          if (/^[0-9]$/.test(k)) {
            e.preventDefault();
            // limita a algo razoável (até 999 trilhões em centavos)
            if (digits.length >= 15) return;
            const next = (digits === "0" ? "" : digits) + k;
            emit(next);
            return;
          }

          // qualquer outra tecla imprimível é bloqueada
          if (k.length === 1) e.preventDefault();
        }}
        onPaste={(e) => {
          onPaste?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          const text = e.clipboardData.getData("text").trim();
          if (!text) return;
          // normaliza "R$ 1.234,56" / "1234.56" / "1234,5" → centavos
          const cleaned = text.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
          const num = Number(cleaned);
          if (!Number.isFinite(num)) return;
          emit(String(Math.max(0, Math.round(num * 100))));
        }}
        onChange={() => {
          // controlado via onKeyDown/onPaste; aqui evitamos warnings de input controlado
        }}
      />
    </div>
  );
}

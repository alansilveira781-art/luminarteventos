import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (n: number) => void;
};

/**
 * Input numérico controlado que permite limpar completamente o campo
 * (apagar o "0") sem que ele seja imediatamente repopulado.
 */
export function NumberInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState<string>(() => (value ? String(value) : ""));
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    const parsed = text === "" ? 0 : Number(text);
    if (parsed !== value) {
      setText(value ? String(value) : "");
    }
  }, [value, text]);

  return (
    <Input
      type="number"
      inputMode="decimal"
      {...rest}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        rest.onBlur?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        onChange(v === "" ? 0 : Number(v));
      }}
    />
  );
}

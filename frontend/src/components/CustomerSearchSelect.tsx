import { useEffect, useRef, useState } from "react";
import type { CustomerListItem } from "../lib/api";
import "./CustomerSearchSelect.css";

interface Props {
  customers: CustomerListItem[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
}

export function CustomerSearchSelect({ customers, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === value) ?? null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(normalizedQuery) || c.phone.includes(normalizedQuery),
      )
    : customers;

  return (
    <div className="customer-search" ref={containerRef}>
      <input
        className="text-input"
        placeholder={placeholder ?? "Buscar por nome ou telefone"}
        value={open ? query : (selected?.name ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => setQuery(event.target.value)}
      />
      {open ? (
        <div className="customer-search-results">
          {results.length === 0 ? (
            <p className="customer-search-empty">Nenhum cliente encontrado.</p>
          ) : (
            results.slice(0, 8).map((customer) => (
              <button
                type="button"
                key={customer.id}
                className="customer-search-result"
                onClick={() => {
                  onChange(customer.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <b>{customer.name}</b>
                <span>{customer.phone}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

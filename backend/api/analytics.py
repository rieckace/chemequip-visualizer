from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd


class CsvValidationError(ValueError):
    pass


REQUIRED_COLUMNS = {
    'equipment_name': ['equipment name', 'equipment', 'name', 'equipment_name', 'equipmentname'],
    'type': ['type', 'equipment type', 'equipment_type'],
    'flowrate': ['flowrate', 'flow rate', 'flow_rate'],
    'pressure': ['pressure'],
    'temperature': ['temperature', 'temp'],
}


def _normalize_col(col: str) -> str:
    return ''.join(ch for ch in col.strip().lower() if ch.isalnum())


def _build_column_map(actual_columns: list[str]) -> dict[str, str]:
    normalized_to_actual = {_normalize_col(c): c for c in actual_columns}

    mapping: dict[str, str] = {}
    missing: list[str] = []

    for canonical, aliases in REQUIRED_COLUMNS.items():
        found_actual = None
        for alias in aliases:
            key = _normalize_col(alias)
            # try direct match
            if key in normalized_to_actual:
                found_actual = normalized_to_actual[key]
                break
        if not found_actual:
            missing.append(canonical)
        else:
            mapping[canonical] = found_actual

    if missing:
        raise CsvValidationError(
            "Missing required columns: " + ", ".join(missing) +
            ". Expected columns like: Equipment Name, Type, Flowrate, Pressure, Temperature."
        )

    return mapping


@dataclass(frozen=True)
class ParsedDataset:
    df: pd.DataFrame
    summary: dict[str, Any]


def parse_and_analyze_csv(file_path: str) -> ParsedDataset:
    try:
        df = pd.read_csv(file_path)
    except Exception as exc:  # pragma: no cover
        raise CsvValidationError(f"Unable to read CSV: {exc}") from exc

    if df.empty:
        raise CsvValidationError("CSV is empty.")

    column_map = _build_column_map(list(df.columns))

    cleaned = pd.DataFrame({
        'equipment_name': df[column_map['equipment_name']].astype(str),
        'type': df[column_map['type']].astype(str),
        'flowrate': pd.to_numeric(df[column_map['flowrate']], errors='coerce'),
        'pressure': pd.to_numeric(df[column_map['pressure']], errors='coerce'),
        'temperature': pd.to_numeric(df[column_map['temperature']], errors='coerce'),
    })

    total_count = int(len(cleaned))
    type_distribution = (
        cleaned['type']
        .fillna('')
        .replace({'nan': ''})
        .apply(lambda s: s.strip() if isinstance(s, str) else str(s))
        .replace({'': 'Unknown'})
        .value_counts(dropna=False)
        .to_dict()
    )

    def _mean(series: pd.Series) -> float | None:
        value = series.mean(skipna=True)
        if pd.isna(value):
            return None
        return float(value)

    summary = {
        'total_count': total_count,
        'averages': {
            'flowrate': _mean(cleaned['flowrate']),
            'pressure': _mean(cleaned['pressure']),
            'temperature': _mean(cleaned['temperature']),
        },
        'type_distribution': {str(k): int(v) for k, v in type_distribution.items()},
        'columns': ['equipment_name', 'type', 'flowrate', 'pressure', 'temperature'],
    }

    return ParsedDataset(df=cleaned, summary=summary)

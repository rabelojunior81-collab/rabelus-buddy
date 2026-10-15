# Registros

**Classe:** REGISTRO. Evidência datada e append-only: auditorias, incidentes, verificações, relatos de sessão que merecem mais que uma linha no ledger.

Nome obrigatório (o lint confere): `<carimbo>-<slug>.<ext>` ou pasta `<carimbo>-<slug>/`. Gere com `npm run bd -- name "Título" --ext md`.

Um registro não se corrige reescrevendo: escreve-se um novo, que cita o anterior.

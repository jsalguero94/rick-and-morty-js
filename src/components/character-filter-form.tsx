import { zodResolver } from "@hookform/resolvers/zod"
import { Eraser, Search } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  characterFilterSchema,
  defaultCharacterFilter,
  genderOptions,
  statusOptions,
} from "@/lib/validations"
import type { CharacterFilterValues } from "@/lib/validations"

export interface CharacterFilterFormProps {
  onSubmit: (values: CharacterFilterValues) => void
}

export function CharacterFilterForm({ onSubmit }: CharacterFilterFormProps) {
  const { control, handleSubmit, reset } = useForm<CharacterFilterValues>({
    resolver: zodResolver(characterFilterSchema),
    defaultValues: defaultCharacterFilter,
  })

  const submitFilters = (values: CharacterFilterValues) => {
    onSubmit({
      name: values.name?.trim() || undefined,
      status: values.status,
      gender: values.gender,
    })
  }

  const resetFilters = () => {
    reset(defaultCharacterFilter)
    onSubmit(defaultCharacterFilter)
  }

  return (
    <form
      onSubmit={handleSubmit(submitFilters)}
      className="glass-panel grid gap-4 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end"
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="filter-name">Name</FieldLabel>
            <FieldContent>
              <Input
                id="filter-name"
                placeholder="e.g. Rick Sanchez"
                aria-invalid={fieldState.invalid}
                className="focus-visible:ring-primary/50"
                {...field}
              />
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </FieldContent>
          </Field>
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="filter-status">Status</FieldLabel>
            <FieldContent>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="filter-status"
                  className="w-full focus-visible:ring-primary/50"
                >
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        )}
      />

      <Controller
        control={control}
        name="gender"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="filter-gender">Gender</FieldLabel>
            <FieldContent>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="filter-gender"
                  className="w-full focus-visible:ring-primary/50"
                >
                  <SelectValue placeholder="Any gender" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        )}
      />

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          <Search />
          Apply
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={resetFilters}
        >
          <Eraser />
          Reset
        </Button>
      </div>
    </form>
  )
}
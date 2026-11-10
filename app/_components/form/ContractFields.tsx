"use client";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type FieldErrors,
} from "react-hook-form";
import type { AdminContractFormValues } from "@/lib/validations/contract";
import { useLanguage } from "@/lib/languageContext";
import {
  getSaudiTodayDateStr,
  getSaudiCurrentTimeStr,
} from "@/lib/contractConstants";
import { CustomInput } from "./CustomInput";
import { CustomDatePicker } from "./CustomDatePicker";
import { CustomTimePicker } from "./CustomTimePicker";
interface ContractFieldsProps {
  control: Control<AdminContractFormValues>;
  register: UseFormRegister<AdminContractFormValues>;
  errors: FieldErrors<AdminContractFormValues>;
}
export function ContractGuestFields({
  register,
  errors,
}: Omit<ContractFieldsProps, "control">) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  return (
    <>
      <CustomInput
        label={text("اسم الضيف الأساسي", "Lead guest name")}
        required
        expandable
        autoComplete="name"
        {...register("customerName")}
        error={errors.customerName?.message}
      />
      <CustomInput
        label={text("رقم جوال الضيف", "Guest phone number")}
        type="tel"
        expandable
        autoComplete="tel"
        dir="ltr"
        {...register("customerPhone")}
        error={errors.customerPhone?.message}
      />
    </>
  );
}
export function ContractJourneyFields({
  control,
  register,
  errors,
}: ContractFieldsProps) {
  const { language } = useLanguage();
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  return (
    <>
      <CustomInput
        label={text("موقع الانطلاق", "Departure location")}
        required
        expandable
        {...register("origin")}
        error={errors.origin?.message}
      />
      <CustomInput
        label={text("وجهة الوصول", "Arrival destination")}
        required
        expandable
        {...register("destination")}
        error={errors.destination?.message}
      />
      <Controller
        control={control}
        name="tripDate"
        render={({ field, fieldState }) => (
          <CustomDatePicker
            label={text("تاريخ الرحلة", "Trip date")}
            required
            value={field.value || getSaudiTodayDateStr()}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="tripTime"
        render={({ field, fieldState }) => (
          <CustomTimePicker
            label={text("وقت الرحلة", "Trip time")}
            required
            value={field.value || getSaudiCurrentTimeStr()}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <CustomInput
        label={text("شركة الطيران (اختياري)", "Airline (optional)")}
        expandable
        {...register("flightCarrier")}
        error={errors.flightCarrier?.message}
      />
      <CustomInput
        label={text("رقم الرحلة الجوية (اختياري)", "Flight number (optional)")}
        expandable
        dir="ltr"
        {...register("flightNumber")}
        error={errors.flightNumber?.message}
      />
    </>
  );
}
interface ContractIssueDateProps {
  control: Control<AdminContractFormValues>;
  setValue: UseFormSetValue<AdminContractFormValues>;
}
export function ContractIssueDate({
  control,
  setValue,
}: ContractIssueDateProps) {
  const { language } = useLanguage();
  const mode = useWatch({ control, name: "issueDateMode" }) || "AUTO";
  const text = (ar: string, en: string) => (language === "ar" ? ar : en);
  return (
    <fieldset className="sm:col-span-2 lg:col-span-3 border-t theme-border pt-5">
      <legend className="mb-2.5 text-sm sm:text-base font-semibold">
        {text("تاريخ إصدار العقد", "Contract issue date")}
      </legend>
      <div className="flex flex-wrap items-center gap-5">
        <label className="flex min-h-12 cursor-pointer items-center gap-2.5 text-base font-medium">
          <input
            type="radio"
            className="h-5 w-5 accent-[var(--accent-gold)]"
            name="issue-mode"
            checked={mode === "AUTO"}
            onChange={() =>
              setValue("issueDateMode", "AUTO", { shouldDirty: true })
            }
          />
          {text("تاريخ اليوم", "Today")}
        </label>
        <label className="flex min-h-12 cursor-pointer items-center gap-2.5 text-base font-medium">
          <input
            type="radio"
            className="h-5 w-5 accent-[var(--accent-gold)]"
            name="issue-mode"
            checked={mode === "MANUAL"}
            onChange={() =>
              setValue("issueDateMode", "MANUAL", { shouldDirty: true })
            }
          />
          {text("تاريخ مخصص", "Custom date")}
        </label>
      </div>
      {mode === "MANUAL" ? (
        <div className="mt-3 max-w-sm">
          <Controller
            control={control}
            name="issueDate"
            render={({ field, fieldState }) => (
              <CustomDatePicker
                label={text("تاريخ الإصدار المخصص", "Custom issue date")}
                value={field.value || getSaudiTodayDateStr()}
                onChange={field.onChange}
                error={fieldState.error?.message}
                required
              />
            )}
          />
        </div>
      ) : (
        <p className="mt-2 text-base text-[var(--text-muted)]">
          <bdi>{getSaudiTodayDateStr()}</bdi>
        </p>
      )}
    </fieldset>
  );
}

/**
 * Shared ManagedRuntime for Translator API (`TranslatorApi.Live`).
 */
import { TranslatorApi } from "@/app/adapter/translation.adapter"
import { ManagedRuntime } from "effect"

export const TranslatorApiRuntime = ManagedRuntime.make(TranslatorApi.Live)

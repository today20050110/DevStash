import { z } from "zod";

/** server action 共用的錯誤訊息與 Zod 驗證失敗的回應格式 */
export const NOT_SIGNED_IN_MESSAGE =
  "You are no longer signed in. Please sign in again.";
export const GENERIC_ERROR_MESSAGE = "Something went wrong, please try again";
export const FIX_FIELDS_MESSAGE = "Please fix the highlighted fields";

/**
 * Zod 驗證失敗時的回應：表單層級的錯誤優先，否則提示修正欄位，並附上每個欄位的第一則錯誤。
 * 陣列中個別元素的錯誤（例如 tags[2]）也歸到該欄位。
 */
export function validationFailure<T>(error: z.ZodError<T>) {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return {
    success: false,
    error: formErrors[0] ?? FIX_FIELDS_MESSAGE,
    fieldErrors: firstErrors(fieldErrors as Partial<Record<string, string[]>>),
  };
}

function firstErrors<Field extends string>(
  fieldErrors: Partial<Record<Field, string[]>>,
): Partial<Record<Field, string>> {
  return Object.fromEntries(
    Object.entries<string[] | undefined>(fieldErrors).map(
      ([field, messages]) => [field, messages?.[0]],
    ),
  ) as Partial<Record<Field, string>>;
}

"use client";

import {
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CollectionField, CollectionResult } from "@/actions/collections";
import {
  errorProps,
  ItemFormField,
} from "@/components/items/ItemFormFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
} from "@/lib/collection-schemas";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";

export type CollectionFormValues = Record<CollectionField, string>;
type CollectionFormErrors = Partial<Record<CollectionField, string>>;

export const EMPTY_COLLECTION_VALUES: CollectionFormValues = {
  name: "",
  description: "",
};

interface CollectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** 每次開啟時的表單內容；新增為空白，編輯為目前的值 */
  initialValues: CollectionFormValues;
  submitLabel: string;
  submitIcon: ReactNode;
  /** 呼叫對應的 server action */
  submit: (values: CollectionFormValues) => Promise<CollectionResult>;
  /** 成功時的 toast 文字 */
  successMessage: (name: string) => string;
  failureMessage: string;
  /** 沒有 DialogTrigger 時，關閉後要把焦點還給的元素；Radix 只會還給自己的 trigger */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * 新增與編輯 collection 共用的 dialog：name、description、送出流程與錯誤顯示。
 * 開關由呼叫端控制；外層以 key 或條件渲染讓每次開啟都從 initialValues 開始
 */
export function CollectionFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValues,
  submitLabel,
  submitIcon,
  submit,
  successMessage,
  failureMessage,
  returnFocusRef,
}: CollectionFormDialogProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<CollectionFormErrors>({});
  const [isSubmitting, startSubmitting] = useTransition();

  function handleOpenChange(next: boolean) {
    // 送出中不讓 Esc／點外面關閉，避免看不到結果
    if (isSubmitting) {
      return;
    }
    onOpenChange(next);
    if (!next) {
      setValues(initialValues);
      setErrors({});
    }
  }

  function setValue(field: CollectionField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSubmitting(async () => {
      const result = await callServerAction(() => submit(values));
      // 沒連上伺服器：dialog 保持開啟、內容保留，讓使用者重試
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? failureMessage);
        return;
      }
      toast.success(successMessage(result.data.name));
      onOpenChange(false);
      setValues(initialValues);
      setErrors({});
      // collection 卡片、頁首、側邊欄與 item 表單的選項都是 server component 提供的
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* noValidate：錯誤訊息交給伺服器端的 Zod，一致顯示在欄位下方 */}
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <ItemFormField id="collection-name" label="Name" error={errors.name}>
            <Input
              id="collection-name"
              {...errorProps("collection-name", errors.name)}
              value={values.name}
              onChange={(event) => setValue("name", event.target.value)}
              maxLength={COLLECTION_NAME_MAX_LENGTH}
              placeholder="React Patterns"
              required
              autoFocus
            />
          </ItemFormField>
          <ItemFormField
            id="collection-description"
            label="Description"
            error={errors.description}
          >
            <Textarea
              id="collection-description"
              {...errorProps("collection-description", errors.description)}
              value={values.description}
              onChange={(event) => setValue("description", event.target.value)}
              maxLength={COLLECTION_DESCRIPTION_MAX_LENGTH}
              placeholder="Optional"
              rows={3}
            />
          </ItemFormField>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting || values.name.trim() === ""}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : submitIcon}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

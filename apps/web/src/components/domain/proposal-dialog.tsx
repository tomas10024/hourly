"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formErrors } from "@/lib/errors";
import { moneyError, toNumber, toText } from "@/lib/form";
import { useSubmitProposal } from "@/lib/queries/proposals";

type Errors = Partial<Record<"price" | "hourlyRate" | "estimatedDays" | "message" | "form", string>>;

/** `POST /projects/{id}/proposals` - a specialist's offer: price and/or rate, duration, a note. */
export function ProposalDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const submit = useSubmitProposal(projectId);
  const toast = useToast();
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("");
  const [days, setDays] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const onSubmit = () => {
    const values = { price: toNumber(price), hourlyRate: toNumber(rate), estimatedDays: toNumber(days), message: toText(message) };
    const found: Errors = {
      price: moneyError(values.price),
      hourlyRate: moneyError(values.hourlyRate),
    };
    if (values.price === null && values.hourlyRate === null) found.price = "Nurodykite kainą arba valandinį įkainį.";
    if (values.estimatedDays !== null && (!Number.isInteger(values.estimatedDays) || values.estimatedDays < 1 || values.estimatedDays > 3650)) {
      found.estimatedDays = "Sveikas skaičius nuo 1 iki 3650.";
    }
    if (values.message && values.message.length > 5000) found.message = "Ne daugiau kaip 5000 simbolių.";
    const clean = Object.fromEntries(Object.entries(found).filter(([, v]) => v)) as Errors;
    setErrors(clean);
    if (Object.keys(clean).length) return;

    submit.mutate(values, {
      onSuccess: () => {
        toast.success("> pasiulymas_pateiktas [201]", "Užsakovas gaus jūsų pasiūlymą.");
        setPrice("");
        setRate("");
        setDays("");
        setMessage("");
        onClose();
      },
      onError: (error) => {
        const { fields, form } = formErrors(error);
        setErrors({ ...fields, form });
      },
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pateikti pasiūlymą"
      onSubmit={onSubmit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>
            Atšaukti
          </Button>
          <Button type="submit" variant="hack" icon={Send} loading={submit.isPending} glitch>
            Pateikti
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kaina, €" error={errors.price}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1 600" />}
          </Field>
          <Field label="Įkainis, €/val." error={errors.hourlyRate}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="40" />}
          </Field>
        </div>
        <Field label="Numatoma trukmė, d." error={errors.estimatedDays} hint="Kalendorinės dienos nuo darbo pradžios.">
          {(p) => <Input {...p} type="number" inputMode="numeric" min={1} step={1} value={days} onChange={(e) => setDays(e.target.value)} placeholder="21" />}
        </Field>
        <Field label="Žinutė užsakovui" error={errors.message}>
          {(p) => <Textarea {...p} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Trumpai: kodėl jūs ir kaip dirbsite." />}
        </Field>
      </div>
    </Dialog>
  );
}

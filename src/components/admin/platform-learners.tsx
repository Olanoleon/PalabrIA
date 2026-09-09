"use client";

import { useMemo, useState } from "react";
import {
  deleteLearner,
  inviteLearner,
  setLearnerActive,
  updateLearner,
} from "@/lib/actions/admin";
import { Panel, StatTile, Tag, Empty, TableScroll, Th, Td } from "@/components/admin/pieces";
import { ActionForm, Field, Select, SmallButton } from "@/components/admin/form-bits";
import { ConfirmAction } from "@/components/admin/confirm-action";
import {
  DisableIcon,
  EditIcon,
  EnableIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { formatDate, formatMoney, type Lang } from "@/lib/i18n";
import { adminT } from "@/lib/i18n-admin";
import { cn } from "@/lib/cn";
import { TRIAL_DAYS } from "@/lib/billing-rules";
import type { LearnerDashboard, PlatformLearnerRow } from "@/lib/admin-data";

/**
 * Every learner on the platform, in one place.
 *
 * Replaces a panel-per-organisation layout that made finding a person depend
 * on already knowing which company they were in — and that repeated the whole
 * create form once per organisation. One button, one table, organisation as a
 * column and as a filter.
 */
export function PlatformLearners({
  learners,
  organizations,
  dashboard,
  lang,
}: {
  learners: PlatformLearnerRow[];
  organizations: Array<{ id: string; name: string }>;
  dashboard: LearnerDashboard;
  lang: Lang;
}) {
  const d = adminT(lang);
  const statusLabels = STATUS_LABELS(d);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return learners.filter((row) => {
      if (orgFilter && row.orgId !== orgFilter) return false;
      if (statusFilter === "disabled" && row.isActive) return false;
      if (statusFilter === "noAccess" && row.hasAccess) return false;
      if (statusFilter && !["disabled", "noAccess"].includes(statusFilter)) {
        if (row.effectiveStatus !== statusFilter) return false;
      }
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle)
      );
    });
  }, [learners, query, orgFilter, statusFilter]);

  return (
    <>
      <div>
        <SmallButton
          tone="primary"
          onClick={() => setCreating((v) => !v)}
          disabled={organizations.length === 0}
        >
          {creating ? d.close : d.learnerCreateNew}
        </SmallButton>
      </div>

      {creating ? (
        <div className="rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
          <ActionForm
            action={inviteLearner}
            submitLabel={d.learnerCreate}
            onDone={() => setCreating(false)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={d.name} name="name" required minLength={2} />
              <Field label={d.email} name="email" type="email" required />
              <Field label={`${d.team} (${d.optional})`} name="team" />
              {/* Always present here: a Super Admin has no organisation of
                  their own to fall back on, so one must be chosen. */}
              <Select label={d.learnerOrg} name="orgId" required>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-[11.5px] text-muted-2">{d.learnerInviteNote(TRIAL_DAYS)}</p>
          </ActionForm>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          value={dashboard.lifetime}
          label={d.learnerStatLifetime}
          hint={d.learnerStatLifetimeHint}
        />
        <StatTile
          value={dashboard.active}
          label={d.learnerStatActive}
          hint={d.learnerStatActiveHint}
          tone="pass"
        />
        <StatTile
          value={dashboard.monetized}
          label={d.learnerStatMonetized}
          hint={d.learnerStatMonetizedHint}
          tone="soft"
        />
        <StatTile
          value={formatMoney(dashboard.yearIncome, dashboard.currency, lang)}
          label={d.learnerStatIncome}
          hint={d.learnerStatIncomeHint}
        />
      </div>

      <Panel
        title={d.learnersTitle}
        description={d.learnerShowing(shown.length, learners.length)}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field
            label={d.learnerFilterSearch}
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <Select
            label={d.learnerFilterOrg}
            name="org"
            value={orgFilter}
            onChange={(event) => setOrgFilter(event.target.value)}
          >
            <option value="">{d.learnerFilterAll}</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
          <Select
            label={d.learnerFilterStatus}
            name="status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">{d.learnerFilterAllStatuses}</option>
            <option value="disabled">{d.learnerFilterDisabled}</option>
            <option value="noAccess">{d.learnerFilterNoAccess}</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {shown.length === 0 ? (
          <Empty>{d.learnerNoMatches}</Empty>
        ) : (
          <TableScroll>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <Th>{d.colLearner}</Th>
                  <Th>{d.colOrg}</Th>
                  <Th>{d.colCreated}</Th>
                  <Th>{d.colPayment}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    lang={lang}
                    editing={editing === row.id}
                    onEdit={() => setEditing(editing === row.id ? null : row.id)}
                    onDone={() => setEditing(null)}
                  />
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}

/** The dictionary's own status wording, keyed by the enum value. */
function STATUS_LABELS(d: ReturnType<typeof adminT>): Record<string, string> {
  return {
    TRIAL: d.statusTrial,
    ACTIVE: d.statusActive,
    PAST_DUE: d.statusPastDue,
    SUSPENDED: d.statusSuspended,
    OVERRIDE_ACTIVE: d.statusOverride,
    DISABLED: d.statusDisabled,
  };
}

function Row({
  row,
  lang,
  editing,
  onEdit,
  onDone,
}: {
  row: PlatformLearnerRow;
  lang: Lang;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
}) {
  const d = adminT(lang);
  const statusLabel = STATUS_LABELS(d)[row.effectiveStatus] ?? row.effectiveStatus;

  return (
    <>
      <tr className={cn(!row.isActive && "opacity-60")}>
        <Td>
          <span className="block font-semibold">{row.name}</span>
          <span className="block text-[11.5px] text-muted-2">{row.email}</span>
        </Td>
        <Td>
          <span className="block">{row.orgName}</span>
          {row.orgPaid ? (
            <span className="block text-[11px] text-muted-2">
              {d.learnerOrgPaidTag}
            </span>
          ) : null}
        </Td>
        <Td className="whitespace-nowrap">{formatDate(row.createdAt, lang)}</Td>
        <Td>
          {row.isActive ? (
            <Tag tone={row.hasAccess ? "pass" : "neutral"}>
              {statusLabel}
            </Tag>
          ) : (
            <Tag tone="neutral">{d.learnerDisabledTag}</Tag>
          )}
        </Td>
        <Td>
          <div className="flex justify-end gap-[6px]">
            <button
              type="button"
              onClick={onEdit}
              aria-label={d.edit}
              title={d.edit}
              className="press grid size-8 flex-none place-items-center rounded-[10px] border-2 border-ink bg-surface hard-1"
            >
              <EditIcon />
            </button>

            {row.isActive ? (
              <ConfirmAction
                icon={<DisableIcon />}
                srLabel={d.deactivate}
                title={d.learnerDisableTitle}
                body={d.learnerDisableBody(row.name)}
                confirmLabel={d.learnerDisableConfirm}
                lang={lang}
                onConfirm={() => setLearnerActive(row.id, false)}
              />
            ) : (
              <ConfirmAction
                icon={<EnableIcon />}
                srLabel={d.reactivate}
                title={d.learnerEnableTitle}
                body={d.learnerEnableBody(row.name)}
                confirmLabel={d.learnerEnableConfirm}
                lang={lang}
                onConfirm={() => setLearnerActive(row.id, true)}
              />
            )}

            <ConfirmAction
              icon={<TrashIcon />}
              srLabel={d.delete}
              title={d.learnerDeleteTitle}
              body={d.learnerDeleteBody(row.name)}
              confirmLabel={d.learnerDeleteConfirm}
              tone="danger"
              lang={lang}
              onConfirm={() => deleteLearner(row.id)}
            />
          </div>
        </Td>
      </tr>

      {editing ? (
        <tr>
          <Td className="!pt-0" />
          <td colSpan={4} className="pb-4">
            <div className="rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
              <ActionForm
                action={updateLearner}
                submitLabel={d.save}
                hidden={{ learnerId: row.id }}
                onDone={onDone}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={d.name} name="name" defaultValue={row.name} required />
                  <Field
                    label={d.email}
                    name="email"
                    type="email"
                    defaultValue={row.email}
                    required
                  />
                  <Field
                    label={`${d.team} (${d.optional})`}
                    name="team"
                    defaultValue={row.team ?? ""}
                  />
                </div>
                <p className="text-[11.5px] text-muted-2">{d.learnerEmailHint}</p>
              </ActionForm>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

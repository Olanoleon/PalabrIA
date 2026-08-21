"use client";

import { useState } from "react";
import {
  inviteLearner,
  overrideLearnerStatus,
  setLearnerActive,
  updateLearner,
} from "@/lib/actions/admin";
import { Panel, Tag, Td, Th, TableScroll, Empty } from "@/components/admin/pieces";
import { ActionForm, Field, Select, SmallButton, TextArea } from "@/components/admin/form-bits";
import type { LearnerRow } from "@/lib/admin-data";
import { formatDate, type Lang } from "@/lib/i18n";
import { adminT } from "@/lib/i18n-admin";

const STATUS_TONE: Record<string, "pass" | "warn" | "danger" | "neutral" | "brand"> = {
  ACTIVE: "pass",
  TRIAL: "brand",
  PAST_DUE: "warn",
  SUSPENDED: "danger",
  OVERRIDE_ACTIVE: "brand",
  DISABLED: "danger",
};

export function LearnersPanel({
  learners,
  lang,
  organizations,
}: {
  learners: LearnerRow[];
  lang: Lang;
  /** Only the Super Admin gets a picker; an Org Admin is pinned to their own. */
  organizations?: Array<{ id: string; name: string }>;
}) {
  const d = adminT(lang);
  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: d.statusActive,
    TRIAL: d.statusTrial,
    PAST_DUE: d.statusPastDue,
    SUSPENDED: d.statusSuspended,
    OVERRIDE_ACTIVE: d.statusOverride,
    DISABLED: d.statusDisabled,
  };
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <Panel
        title={d.learnersTitle}
        description={d.learnersCount(learners.length, learners.filter((l) => l.hasAccess && l.isActive).length)}
        actions={
          <SmallButton tone="primary" onClick={() => setInviting((v) => !v)}>
            {inviting ? d.close : d.learnerInvite}
          </SmallButton>
        }
      >
        {inviting ? (
          <div className="mb-5 rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
            <ActionForm
              action={inviteLearner}
              submitLabel={d.learnerCreate}
              onDone={() => setInviting(false)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={d.name} name="name" required minLength={2} />
                <Field label={d.email} name="email" type="email" required />
                <Field label={`${d.team} (${d.optional})`} name="team" />
                {organizations ? (
                  <Select label={d.learnerOrg} name="orgId" required>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </Select>
                ) : null}
              </div>
              <p className="text-[11.5px] text-muted-2">
                {d.learnerInviteNote}
              </p>
            </ActionForm>
          </div>
        ) : null}

        {learners.length === 0 ? (
          <Empty>{d.learnersEmpty}</Empty>
        ) : (
          <TableScroll>
            <thead>
              <tr>
                <Th>{d.colLearner}</Th>
                <Th>{d.colProgress}</Th>
                <Th>{d.colActivity}</Th>
                <Th>{d.colPayment}</Th>
                <Th className="text-right">{d.colActions}</Th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => (
                <tr key={learner.id}>
                  <Td>
                    <div className="font-semibold">{learner.name}</div>
                    <div className="text-[11.5px] text-muted-2">{learner.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {learner.team ? <Tag>{learner.team}</Tag> : null}
                      {!learner.isActive ? <Tag tone="danger">{d.learnerInactive}</Tag> : null}
                      {learner.mustChangePassword ? <Tag tone="warn">{d.learnerNeverIn}</Tag> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="font-semibold">{d.learnerLevel(learner.level)}</div>
                    <div className="text-[11.5px] text-muted-2">
                      {d.learnerProgress(learner.xp, learner.unitsPassed, learner.streak)}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-[12px] text-muted-2">
                      {learner.lastActiveAt
                        ? formatDate(learner.lastActiveAt, lang)
                        : d.never}
                    </div>
                  </Td>
                  <Td>
                    <Tag tone={STATUS_TONE[learner.effectiveStatus] ?? "neutral"}>
                      {STATUS_LABEL[learner.effectiveStatus] ?? learner.effectiveStatus}
                    </Tag>
                    <div className="mt-1 text-[11px] text-muted-2">
                      {learner.paidThrough
                        ? d.paidUntil(formatDate(learner.paidThrough, lang))
                        : d.noPeriod}
                    </div>
                    {learner.overrideNote ? (
                      <div className="mt-1 text-[11px] italic text-muted-2">
                        {learner.overrideNote}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <SmallButton
                        onClick={() =>
                          setEditing(editing === learner.id ? null : learner.id)
                        }
                      >
                        {editing === learner.id ? d.close : d.edit}
                      </SmallButton>
                      <SmallButton
                        tone={learner.isActive ? "danger" : "soft"}
                        onClick={() => setLearnerActive(learner.id, !learner.isActive)}
                      >
                        {learner.isActive ? d.deactivate : d.reactivate}
                      </SmallButton>
                    </div>
                    {editing === learner.id ? (
                      <div className="mt-3 flex flex-col gap-4 rounded-2xl border-2 border-ink bg-cream p-3 text-left">
                        <ActionForm
                          action={updateLearner}
                          submitLabel={d.learnerSaveData}
                          hidden={{ learnerId: learner.id }}
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label={d.name} name="name" defaultValue={learner.name} />
                            <Field
                              label={d.team}
                              name="team"
                              defaultValue={learner.team ?? ""}
                            />
                          </div>
                        </ActionForm>

                        <div className="h-px bg-rule" />

                        <ActionForm
                          action={overrideLearnerStatus}
                          submitLabel={d.learnerApplyStatus}
                          tone="soft"
                          hidden={{ learnerId: learner.id }}
                        >
                          <Select
                            label={d.learnerManualStatus}
                            name="status"
                            defaultValue={
                              learner.billingStatus === "OVERRIDE_ACTIVE" ||
                              learner.billingStatus === "DISABLED"
                                ? learner.billingStatus
                                : "AUTO"
                            }
                          >
                            <option value="AUTO">{d.learnerStatusAuto}</option>
                            <option value="OVERRIDE_ACTIVE">
                              {d.learnerStatusForced}
                            </option>
                            <option value="DISABLED">{d.learnerStatusDisabled}</option>
                          </Select>
                          <TextArea
                            label={d.reason}
                            name="note"
                            required
                            placeholder={d.learnerReasonHint}
                          />
                        </ActionForm>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}

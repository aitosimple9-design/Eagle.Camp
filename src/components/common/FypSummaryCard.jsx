import React from 'react';
import { useCalculatorState } from '../../context/CalculatorContext.jsx';
import { isFC, isSL, isSM } from '../../logic/role-groups.js';

function Row({ label, val, unit, noFormat = false, highlight = false }) {
  const valStr = noFormat ? val : Number(val).toFixed(1).replace('.0', '');
  const color = highlight
    ? 'text-yellow-300'
    : (Number(val) > 0 ? 'text-teal-300' : 'text-slate-500');
  return (
    <div className="fyp-summary-row flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`${color} font-semibold text-sm`}>
        {valStr} <span className="text-slate-500 font-normal text-xs">{unit}</span>
      </span>
    </div>
  );
}

export default function FypSummaryCard() {
  const state = useCalculatorState();
  const role = state.role;
  const fypMil = state.fyp / 1_000_000;

  return (
    <div id="fyp-summary-rows">
      {isFC(role) && (
        <>
          <Row label="FYP Cá nhân Tháng" val={fypMil} unit="triệu ₫" />
          {state.hasQuarterBonus && (
            <Row label="FYP Cá nhân Quý" val={state.fypQuarter / 1_000_000} unit="triệu ₫" />
          )}
          {role === 'StarFC' && state.monthMode === '14-19' && (
            <Row label="FYP ĐLBH giới thiệu" val={state.starFcReferralFyp / 1_000_000} unit="triệu ₫" />
          )}
        </>
      )}

      {isSL(role) && (
        <>
          <Row label="FYP Nhóm TT Tháng" val={Number(state.fycTeamDirect)} unit="triệu ₫" />
          <Row label="Số lượt hoạt động" val={state.activeHeadcount} unit="lượt" noFormat />
          {(role === 'SSL' || role === 'ESL') && (
            <Row label="FYP GT Lớp 1" val={Number(state.fycTeamIndirectL1)} unit="triệu ₫" />
          )}
          {role === 'ESL' && (
            <Row label="FYP GT Lớp 2" val={Number(state.fycTeamIndirectL2)} unit="triệu ₫" />
          )}
          {state.hasSlQuarterBonus && (
            <Row label="FYP Nhóm TT Quý" val={state.fypTeamQuarter / 1_000_000} unit="triệu ₫" />
          )}
          {state.hasPersonalSales && (
            <>
              <Row label="FYP Cá nhân Tháng" val={fypMil} unit="triệu ₫" />
              {state.hasQuarterBonus && (
                <Row label="FYP Cá nhân Quý" val={state.fypQuarter / 1_000_000} unit="triệu ₫" />
              )}
            </>
          )}
        </>
      )}

      {isSM(role) && (() => {
        const fypTT = Number(state.fypTeamDirectSm) / 1_000_000;
        const fypL1 = Number(state.fypIndirectSmL1) / 1_000_000;
        const fypL2 = Number(state.fypIndirectSmL2) / 1_000_000;
        const fypL3 = Number(state.fypIndirectSmL3) / 1_000_000;
        const total = fypTT
          + (role !== 'SM' ? fypL1 : 0)
          + (!['SM', 'EM'].includes(role) ? fypL2 : 0)
          + (role === 'IRM' ? fypL3 : 0);
        const target = state.smTargetRevenue / 1_000_000;
        const pctHT = target > 0
          ? (total / target * 100).toFixed(1)
          : state.smTargetRatio.toFixed(1);

        return (
          <>
            <Row label="Chỉ tiêu Tháng" val={target.toFixed(0)} unit="triệu ₫" noFormat />
            <Row label="FYP Nhóm TT" val={fypTT} unit="triệu ₫" />
            {role !== 'SM' && <Row label="FYP GT Lớp 1" val={fypL1} unit="triệu ₫" />}
            {!['SM', 'EM'].includes(role) && <Row label="FYP GT Lớp 2" val={fypL2} unit="triệu ₫" />}
            {role === 'IRM' && <Row label="FYP GT Lớp 3" val={fypL3} unit="triệu ₫" />}
            <Row label="% Hoàn thành" val={pctHT} unit="%" noFormat highlight />
            <Row label="Số lượt HĐ" val={state.activeHeadcountSm} unit="lượt" noFormat />
            {state.hasPersonalSales && (
              <Row label="FYP Cá nhân" val={fypMil} unit="triệu ₫" />
            )}
          </>
        );
      })()}
    </div>
  );
}

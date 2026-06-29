import { maxOf } from "../data.js";

export function Tag({ cls, label }) {
  return (
    <span className={`tag ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

export function Tile({ label, value, help }) {
  return (
    <div className="tile">
      <div className="k-label">{label}</div>
      <div className="k-value">{value}</div>
      <div className="k-help">{help}</div>
    </div>
  );
}

// values: number[]; currentIndex: which bar is emphasized (defaults to last)
// tooltipLabel: custom label for tooltip (defaults to "commits")
export function BarChart({ values, labels, currentIndex, variant, tooltipLabel = "commits" }) {
  const cur = currentIndex == null ? values.length - 1 : currentIndex;
  const m = maxOf(values);
  const barsCls = "bars" + (variant === "twelve" ? " twelve" : "") + (variant === "mini" ? " mini" : "");
  const axisCls = "bar-axis" + (variant === "mini" ? " mini" : "");
  
  // Format number with commas for tooltip
  const formatNumber = (num) => num.toLocaleString('en-US');
  
  return (
    <>
      <div className={barsCls}>
        {values.map((v, i) => {
          const h = v === 0 ? 1 : Math.round((v / m) * 100);
          const tooltipText = `${labels[i]}: ${formatNumber(v)} ${tooltipLabel}`;
          return (
            <div className="bar-col" key={i}>
              <div
                className={"bar" + (i === cur ? " current" : "")}
                style={{ height: h + "%" }}
                title={tooltipText}
              />
            </div>
          );
        })}
      </div>
      <div className={axisCls}>
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </>
  );
}

// Stacked bar chart for showing open and closed issues
// values: array of {open, closed} objects
export function StackedBarChart({ values, labels, currentIndex, variant }) {
  const cur = currentIndex == null ? values.length - 1 : currentIndex;
  
  // Calculate max total for scaling
  const totals = values.map(v => (v.open || 0) + (v.closed || 0));
  const m = maxOf(totals);
  
  const barsCls = "bars" + (variant === "twelve" ? " twelve" : "") + (variant === "mini" ? " mini" : "");
  const axisCls = "bar-axis" + (variant === "mini" ? " mini" : "");
  
  // Format number with commas for tooltip
  const formatNumber = (num) => num.toLocaleString('en-US');
  
  return (
    <>
      <div className={barsCls}>
        {values.map((v, i) => {
          const total = (v.open || 0) + (v.closed || 0);
          const h = total === 0 ? 1 : Math.round((total / m) * 100);
          const closedPercent = total > 0 ? ((v.closed || 0) / total) * 100 : 0;
          const openPercent = total > 0 ? ((v.open || 0) / total) * 100 : 0;
          
          const tooltipText = `${labels[i]}: ${formatNumber(total)} issues (${formatNumber(v.open || 0)} open, ${formatNumber(v.closed || 0)} closed)`;
          
          return (
            <div className="bar-col" key={i}>
              <div
                className={"bar stacked" + (i === cur ? " current" : "")}
                style={{ height: h + "%" }}
                title={tooltipText}
              >
                <div className="bar-segment closed" style={{ height: closedPercent + "%" }} />
                <div className="bar-segment open" style={{ height: openPercent + "%" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className={axisCls}>
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </>
  );
}

export function Meter({ label, value, color }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span className="m-val">{value}%</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${color}`} style={{ width: value + "%" }} />
      </div>
    </div>
  );
}

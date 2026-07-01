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
// tooltipFormatter: optional function receiving ({ value, label, index }) and returning tooltip text
export function BarChart({ values, labels, currentIndex, variant, tooltipLabel = "commits", tooltipFormatter }) {
  const cur = currentIndex == null ? values.length - 1 : currentIndex;
  const m = maxOf(values);
  const densityCls = values.length >= 18 ? " dense" : values.length >= 12 ? " compact" : "";
  const barsCls = "bars" + densityCls + (variant === "twelve" ? " twelve" : "") + (variant === "mini" ? " mini" : "");
  const axisCls = "bar-axis" + densityCls + (variant === "mini" ? " mini" : "");
  
  // Format number with commas for tooltip
  const formatNumber = (num) => num.toLocaleString('en-US');
  
  return (
    <>
      <div className={barsCls}>
        {values.map((v, i) => {
          const h = v === 0 ? 1 : Math.round((v / m) * 100);
          const tooltipText = tooltipFormatter
            ? tooltipFormatter({ value: v, label: labels[i], index: i })
            : `${labels[i]}: ${formatNumber(v)} ${tooltipLabel}`;
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

// Stacked bar chart for showing segmented totals
// values: array of objects such as {open, closed} or {returning, newContributors}
export function StackedBarChart({ values, labels, currentIndex, variant, tooltipFormatter, segmentOrder = ["closed", "open"] }) {
  const cur = currentIndex == null ? values.length - 1 : currentIndex;
  
  // Calculate max total for scaling
  const totals = values.map(v => segmentOrder.reduce((sum, key) => sum + (v[key] || 0), 0));
  const m = maxOf(totals);
  
  const densityCls = values.length >= 18 ? " dense" : values.length >= 12 ? " compact" : "";
  const barsCls = "bars" + densityCls + (variant === "twelve" ? " twelve" : "") + (variant === "mini" ? " mini" : "");
  const axisCls = "bar-axis" + densityCls + (variant === "mini" ? " mini" : "");
  
  // Format number with commas for tooltip
  const formatNumber = (num) => num.toLocaleString('en-US');
  
  return (
    <>
      <div className={barsCls}>
        {values.map((v, i) => {
          const total = segmentOrder.reduce((sum, key) => sum + (v[key] || 0), 0);
          const h = total === 0 ? 1 : Math.round((total / m) * 100);
          const tooltipText = tooltipFormatter
            ? tooltipFormatter({ value: v, label: labels[i], index: i, total })
            : `${labels[i]}: ${formatNumber(total)} issues (${formatNumber(v.open || 0)} open, ${formatNumber(v.closed || 0)} closed)`;
          
          return (
            <div className="bar-col" key={i}>
              <div
                className={"bar stacked" + (i === cur ? " current" : "")}
                style={{ height: h + "%" }}
                title={tooltipText}
              >
                {segmentOrder.map((key) => {
                  const segmentPercent = total > 0 ? ((v[key] || 0) / total) * 100 : 0;
                  return (
                    <div
                      key={key}
                      className={`bar-segment ${key}`}
                      style={{ height: segmentPercent + "%" }}
                    />
                  );
                })}
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

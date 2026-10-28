"use client";

export function ConfluenceDashboard() {
 return <section className="knowledge-page panel" style={{padding:24}}>
  <div className="panel-heading"><div className="panel-title-wrap"><div>
   <h2>Confluence</h2>
   <p>Connect your account to view real Confluence records.</p>
  </div></div><span className="status-chip">NOT CONFIGURED</span></div>
  <div className="activity-empty" style={{padding:32}}>
   <strong>No Confluence connection configured</strong>
   <p>Sample data and simulated synchronization are available only on the dedicated demo branch.</p>
  </div>
 </section>;
}

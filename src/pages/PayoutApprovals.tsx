import { Navigate } from "react-router-dom";

/**
 * "Payout Approvals" sidebar target. The queues themselves live on the
 * Finance page as tabs; this just lands the admin directly on them instead of
 * on the overview, which is how pending approvals went unseen.
 */
const PayoutApprovals = () => (
  <Navigate to="/admin/finance?tab=payouts" replace />
);

export default PayoutApprovals;

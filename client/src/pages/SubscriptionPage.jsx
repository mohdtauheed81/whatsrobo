import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { checkAuth } from "../redux/authSlice";
import api from "../services/api";
import { CreditCard, Check, Zap, AlertCircle, Loader } from "lucide-react";
import "../styles/subscription.css";

function SubscriptionPage() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        api.get("/subscriptions/plans"),
        api.get("/subscriptions/current")
      ]);
      setPlans(plansRes.data.plans || []);
      setSubscription(subRes.data.subscription);
    } catch (err) {
      setError("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    if (!window.confirm("Upgrade to this plan? Your subscription will be renewed for 30 days.")) return;
    try {
      setUpgrading(planId);
      setError(null);
      await api.post("/subscriptions/upgrade", { planId });
      setSuccessMsg("Subscription upgraded successfully!");
      await loadData();
      dispatch(checkAuth());
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upgrade subscription");
    } finally {
      setUpgrading(null);
    }
  };

  const currentPlanId = subscription?.plan?._id;

  if (loading) return (
    <div className="subscription-page">
      <div className="loading-state"><Loader size={32} className="spinner" /><p>Loading...</p></div>
    </div>
  );

  return (
    <div className="subscription-page">
      <div className="page-header">
        <h1>Subscription Plans</h1>
        <p>Choose the perfect plan for your business</p>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={18} /> {error}</div>}
      {successMsg && <div className="alert alert-success"><Check size={18} /> {successMsg}</div>}

      {subscription && (
        <div className="current-plan">
          <CreditCard size={24} />
          <div>
            <h3>Current Plan: <strong>{subscription.plan?.name || "Free"}</strong></h3>
            {subscription.endDate && (
              <p>Expires: {new Date(subscription.endDate).toLocaleDateString()} ({subscription.daysRemaining} days remaining)</p>
            )}
            <p>Status: <span className={subscription.isActive ? "text-success" : "text-danger"}>
              {subscription.isActive ? "Active" : "Expired"}</span>
            </p>
          </div>
        </div>
      )}

      <div className="plans-grid">
        {plans.map(plan => {
          const isCurrent = currentPlanId === plan._id;
          const isUpgrading = upgrading === plan._id;
          return (
            <div key={plan._id} className={"plan-card" + (isCurrent ? " active" : "")}>
              {isCurrent && <div className="plan-badge">Current Plan</div>}
              <h2>{plan.name}</h2>
              <div className="price">
                <span className="amount">${plan.price}</span>
                <span className="period">/month</span>
              </div>
              <div className="features">
                <ul>
                  <li><Check size={16} /> {plan.maxDevices} device{plan.maxDevices > 1 ? "s" : ""}</li>
                  <li><Check size={16} /> {plan.monthlyMessageLimit.toLocaleString()} messages/month</li>
                  {plan.features.map(f => (
                    <li key={f}><Check size={16} /> {f.replace(/_/g, " ")}</li>
                  ))}
                </ul>
              </div>
              <button
                className={isCurrent ? "btn-secondary" : "btn-primary"}
                disabled={isCurrent || isUpgrading}
                onClick={() => !isCurrent && handleUpgrade(plan._id)}
              >
                {isUpgrading ? <><Loader size={16} className="spinner" /> Upgrading...</> :
                 isCurrent ? "Current Plan" :
                 <><Zap size={16} /> {subscription?.plan?.price > plan.price ? "Downgrade" : "Upgrade"}</>}
              </button>
            </div>
          );
        })}
      </div>

      {subscription?.usageStats && (
        <div className="usage-stats">
          <h2>Current Usage</h2>
          <div className="stat-grid">
            <div className="stat-card">
              <h4>Messages This Month</h4>
              <p className="stat-value">{subscription.usageStats.messagesThisMonth?.toLocaleString() || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Total Messages</h4>
              <p className="stat-value">{subscription.usageStats.totalMessagesAllTime?.toLocaleString() || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Days Remaining</h4>
              <p className="stat-value">{subscription.daysRemaining || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionPage;

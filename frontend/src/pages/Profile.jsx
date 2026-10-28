import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, AtSign, KeyRound, Phone, ShieldCheck, User, UserRound } from "lucide-react";
import { getMe, updateProfile, changePassword } from "../services/api";
import "./Profile.css";

export default function ProfilePage({ user, displayName, onDisplayNameUpdated, onBack, onToast }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(displayName || user?.username || "");
  const [emailValue, setEmailValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  
  const [savingName, setSavingName] = useState(false);
 
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((res) => {
        if (!mounted) return;
        const data = res.data || {};
        setProfile(data);
        setName(data.display_name || displayName || data.username || user?.username || "");
        setEmailValue(data.email || data.email_address || "");
        setPhoneValue(data.phone || data.phone_number || data.mobile || "");
        setProfileError("");
      })
      .catch(() => mounted && setProfileError("Unable to load your profile details."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [displayName, user?.username]);

  const account = profile || user || {};
  const username = account.username || user?.username || "";
  const role = account.role || user?.role || "user";
  const email = account.email || account.email_address || "";
  const phone = account.phone || account.phone_number || account.mobile || "";
  const shownName = name || username || "User";

  const initials = useMemo(
    () => shownName.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0].toUpperCase()).join("") || "U",
    [shownName]
  );

  const saveProfile = async () => {
    const value = name.trim();
    const email = emailValue.trim();
    const phone = phoneValue.trim();

    if (!value) {
      onToast?.("Profile Update", "Display name can't be empty.", "error");
      return;
    }

   if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  onToast?.(
    "Profile Update",
    "Please enter a valid email address.",
    "error"
  );
  return;
}

if (phone && !/^[+\d][\d\s().-]{6,19}$/.test(phone)) {
  onToast?.(
    "Profile Update",
    "Please enter a valid phone number.",
    "error"
  );
  return;
}

    setSavingName(true);
    try {
      await updateProfile(value, email, phone);
      setProfile((prev) => ({
        ...(prev || {}),
        display_name: value,
        email,
        phone,
      }));
      onDisplayNameUpdated?.(value);
      onToast?.("Profile Updated", "Your profile details have been updated.", "success");
    } catch (err) {
      onToast?.(
        "Update Failed",
        err?.response?.data?.detail || "Could not update your profile.",
        "error"
      );
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in all three fields.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onToast?.("Password Changed", "Your password has been updated.", "success");
    } catch (err) {
      setPasswordError(err?.response?.data?.detail || "Could not change your password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="profile-page">
      <header className="profile-page-header">
        <div>
          <button type="button" className="profile-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> 
          </button>
          <h1>Profile</h1>
          <p>Manage your profile information and account password.</p>
        </div>
      </header>

      {loading ? (
        <div className="profile-loading-card">
          <div className="profile-loading-avatar" />
          <div className="profile-loading-lines"><div /><div /></div>
        </div>
      ) : (
        <>
          {profileError && <div className="profile-alert">{profileError}</div>}

          <div className="profile-grid">
            <article className="profile-card profile-summary-card">
              <div className="profile-avatar-large">{initials}</div>
              <h2>{shownName}</h2>
              <span className="profile-role">
                {String(role).replace(/^./, (c) => c.toUpperCase())}
              </span>
              <div className="profile-summary-divider" />
              <div className="profile-summary-row"><AtSign size={16} /><span>{email || "Email not provided"}</span></div>
              <div className="profile-summary-row"><Phone size={16} /><span>{phone || "Phone number not provided"}</span></div>
            </article>

            <article className="profile-card">
              <div className="profile-section-heading">
                <div className="profile-section-icon"><UserRound size={17} /></div>
                <div><h2>Profile Information</h2><p>Your account details</p></div>
              </div>

              <div className="profile-fields">
                <div className="profile-field">
                  <label>Display Name</label>
                  <div className="profile-readonly"><UserRound size={15} /><span>{name || "Not provided"}</span></div>
                </div>

                <div className="profile-field-row">
                  <div className="profile-field">
                    <label>User-id</label>
                    <div className="profile-readonly"><User size={15} /><span>{username || "Not provided"}</span></div>
                  </div>
                  <div className="profile-field">
                    <label>Role</label>
                    <div className="profile-readonly"><ShieldCheck size={15} /><span>{String(role).replace(/^./, (c) => c.toUpperCase())}</span></div>
                  </div>
                </div>

                <div className="profile-field-row">
                  <div className="profile-field">
                    <label>Email</label>
                    <div className="profile-readonly"><AtSign size={15} /><span>{emailValue || "Not provided"}</span></div>
                  </div>
                  <div className="profile-field">
                    <label>Phone Number</label>
                    <div className="profile-readonly"><Phone size={15} /><span>{phoneValue || "Not provided"}</span></div>
                  </div>
                </div>
              </div>

            </article>
          </div>

          

          
        </>
      )}
    </section>
  );
}

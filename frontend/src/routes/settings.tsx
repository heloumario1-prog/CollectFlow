import { useState, type FormEvent } from "react";
import { getSettings, updateSettings, type Settings } from "../data/settings";

export function SettingsPage() {
  const [settings, setSettings] = useState(getSettings);
  const [saved, setSaved] = useState(false);

  const updateField = <Key extends keyof Settings>(
    key: Key,
    value: Settings[Key],
    target?: HTMLInputElement | HTMLSelectElement,
  ) => {
    target?.setCustomValidity("");
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalidField = [
      { id: "settings-full-name", value: settings.fullName, label: "Full name" },
      { id: "settings-email", value: settings.email, label: "Email" },
      { id: "settings-phone", value: settings.phone, label: "Phone number" },
      { id: "settings-business-name", value: settings.businessName, label: "Business name" },
      { id: "settings-business-phone", value: settings.businessPhone, label: "Business phone" },
      { id: "settings-business-address", value: settings.businessAddress, label: "Business address" },
    ].find((field) => !field.value.trim());
    if (invalidField) {
      const input = event.currentTarget.elements.namedItem(invalidField.id) as HTMLInputElement;
      input.setCustomValidity(`${invalidField.label} is required.`);
      input.reportValidity();
      return;
    }
    updateSettings(settings);
    setSaved(true);
  };

  return (
    <section className="content-page">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">SETTINGS</p>
          <h1>Settings</h1>
          <p className="page-description">
            Manage your profile, business information, and preferences.
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <section className="settings-section" aria-labelledby="settings-profile-title">
          <div className="form-section-header">
            <h2 id="settings-profile-title">Profile information</h2>
            <p>Your personal contact information.</p>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="settings-full-name">Full name</label>
              <input
                id="settings-full-name"
                type="text"
                value={settings.fullName}
                required
                onChange={(event) => updateField("fullName", event.target.value, event.target)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                type="email"
                value={settings.email}
                required
                onChange={(event) => updateField("email", event.target.value, event.target)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="settings-phone">Phone number</label>
              <input
                id="settings-phone"
                type="tel"
                value={settings.phone}
                required
                onChange={(event) => updateField("phone", event.target.value, event.target)}
              />
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-business-title">
          <div className="form-section-header">
            <h2 id="settings-business-title">Business information</h2>
            <p>Contact details for your business.</p>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="settings-business-name">Business name</label>
              <input
                id="settings-business-name"
                type="text"
                value={settings.businessName}
                required
                onChange={(event) => updateField("businessName", event.target.value, event.target)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="settings-business-phone">Business phone</label>
              <input
                id="settings-business-phone"
                type="tel"
                value={settings.businessPhone}
                required
                onChange={(event) => updateField("businessPhone", event.target.value, event.target)}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="settings-business-address">Business address</label>
              <input
                id="settings-business-address"
                type="text"
                value={settings.businessAddress}
                required
                onChange={(event) => updateField("businessAddress", event.target.value, event.target)}
              />
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-preferences-title">
          <div className="form-section-header">
            <h2 id="settings-preferences-title">Preferences</h2>
            <p>Choose your default currency and language.</p>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="settings-currency">Default currency</label>
              <select
                id="settings-currency"
                value={settings.currency}
                onChange={(event) => updateField("currency", event.target.value as Settings["currency"])}
              >
                <option value="USD">USD</option>
                <option value="LBP">LBP</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="settings-language">Language</label>
              <select
                id="settings-language"
                value={settings.language}
                onChange={(event) => updateField("language", event.target.value as Settings["language"])}
              >
                <option value="English">English</option>
                <option value="French">French</option>
              </select>
            </div>
          </div>
        </section>

        <div className="form-actions">
          {saved && <span className="settings-save-message" role="status">Changes saved.</span>}
          <button type="submit" className="primary-button">Save changes</button>
        </div>
      </form>
    </section>
  );
}
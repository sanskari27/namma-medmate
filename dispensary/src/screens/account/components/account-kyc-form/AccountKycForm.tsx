import { FormEvent, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ACCOUNT_CONTENT } from '../../AccountScreen.content';
import { pdfOrImage } from '../../AccountScreen.utils';
import { selectAccountBusy, statusSet, submitKycPack } from '../../store';

export function AccountKycForm() {
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector(selectAccountBusy);
  const [legalName, setLegalName] = useState('');
  const [drugLicenseNumber, setDrugLicenseNumber] = useState('');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [drugLicense, setDrugLicense] = useState<File | null>(null);
  const [panDocument, setPanDocument] = useState<File | null>(null);
  const [gstCertificate, setGstCertificate] = useState<File | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const gst = gstin.trim();
    if (
      !legalName.trim() ||
      !drugLicenseNumber.trim() ||
      !pan.trim() ||
      !addressLine1.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim() ||
      !contactPhone.trim() ||
      !pdfOrImage(drugLicense) ||
      !pdfOrImage(panDocument) ||
      (gst.length > 0 && !pdfOrImage(gstCertificate))
    ) {
      dispatch(statusSet({ status: 'validation' }));
      return;
    }
    void dispatch(
      submitKycPack({
        legalName: legalName.trim(),
        drugLicenseNumber: drugLicenseNumber.trim(),
        pan: pan.trim(),
        gstin: gst || undefined,
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        contactPhone: contactPhone.trim(),
        drugLicense: drugLicense!,
        panDocument: panDocument!,
        gstCertificate: gst ? gstCertificate! : undefined,
      }),
    );
  };

  return (
    <form className="ac-card ac-card-pad ac-form" onSubmit={onSubmit} noValidate>
      <div>
        <h3 style={{ margin: 0, fontFamily: 'Manrope, Inter, sans-serif', fontSize: 16 }}>{ACCOUNT_CONTENT.kycTitle}</h3>
        <p className="ac-muted">{ACCOUNT_CONTENT.kycHint}</p>
      </div>
      <div className="ac-fields">
        <div className="ac-field" data-span="2">
          <label htmlFor="legalName">Legal pharmacy name</label>
          <input id="legalName" className="ac-input" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </div>
        <div className="ac-field">
          <label htmlFor="drugLicenseNumber">Drug licence number</label>
          <input id="drugLicenseNumber" className="ac-input ac-mono" value={drugLicenseNumber} onChange={(e) => setDrugLicenseNumber(e.target.value)} />
        </div>
        <div className="ac-field">
          <label htmlFor="pan">PAN</label>
          <input id="pan" className="ac-input ac-mono" value={pan} onChange={(e) => setPan(e.target.value)} />
        </div>
        <div className="ac-field" data-span="2">
          <label htmlFor="gstin">GSTIN (optional)</label>
          <input id="gstin" className="ac-input ac-mono" value={gstin} onChange={(e) => setGstin(e.target.value)} />
        </div>
        <div className="ac-field" data-span="2">
          <label htmlFor="addressLine1">Branch address line</label>
          <input id="addressLine1" className="ac-input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
        </div>
        <div className="ac-field">
          <label htmlFor="city">City</label>
          <input id="city" className="ac-input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="ac-field">
          <label htmlFor="state">State</label>
          <input id="state" className="ac-input" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div className="ac-field">
          <label htmlFor="pincode">Pincode</label>
          <input id="pincode" className="ac-input ac-mono" value={pincode} onChange={(e) => setPincode(e.target.value)} />
        </div>
        <div className="ac-field">
          <label htmlFor="contactPhone">Contact phone</label>
          <input id="contactPhone" className="ac-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="ac-field">
          <label htmlFor="drugLicense">Drug licence file</label>
          <input id="drugLicense" className="ac-input" type="file" accept=".pdf,image/jpeg,image/png" onChange={(e) => setDrugLicense(e.target.files?.[0] ?? null)} />
        </div>
        <div className="ac-field">
          <label htmlFor="panDocument">PAN file</label>
          <input id="panDocument" className="ac-input" type="file" accept=".pdf,image/jpeg,image/png" onChange={(e) => setPanDocument(e.target.files?.[0] ?? null)} />
        </div>
        <div className="ac-field" data-span="2">
          <label htmlFor="gstCertificate">GST certificate file</label>
          <input id="gstCertificate" className="ac-input" type="file" accept=".pdf,image/jpeg,image/png" onChange={(e) => setGstCertificate(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <div>
        <button type="submit" className="ac-btn ac-btn-primary" disabled={busy}>
          {busy ? ACCOUNT_CONTENT.sending : ACCOUNT_CONTENT.submitKyc}
        </button>
      </div>
    </form>
  );
}

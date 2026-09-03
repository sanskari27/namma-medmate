import { Button, Input, Label, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, getKycStatus, isApiError, submitKyc, type KycStatus } from '@/services/tenant';
import { sessionStarted, type RootState } from '@/store';
import { AlertCircle, CheckCircle2, ClipboardList, FileWarning, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'submitted'
  | 'rejected'
  | 'approved'
  | null;

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ClipboardList, text: 'Loading pharmacy KYC status…' };
    case 'empty':
      return {
        icon: ClipboardList,
        text: 'No KYC pack yet. Fill the counter form below to unlock the floor.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Enter legal name, licence, PAN, address, phone, and upload drug licence plus PAN files (PDF/JPEG/PNG). GST certificate is required when GSTIN is set.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Only the pharmacy owner can submit KYC from this counter.',
      };
    case 'conflict':
      return {
        icon: FileWarning,
        text: 'A KYC pack is already waiting, or this pharmacy is already decided. Refresh the page.',
      };
    case 'failure':
      return {
        icon: Unplug,
        text: 'Could not reach the server for KYC. Try again from this counter.',
      };
    case 'success':
    case 'submitted':
      return {
        icon: CheckCircle2,
        text: 'KYC pack sent. Floor stays locked until HQ finishes review.',
      };
    case 'rejected':
      return {
        icon: FileWarning,
        text: 'HQ rejected this pack. Fix the noted issue and resubmit from this counter.',
      };
    case 'approved':
      return {
        icon: CheckCircle2,
        text: 'KYC approved. Floor modules are unlocked for this pharmacy.',
      };
    default:
      return null;
  }
}

function pdfOrImage(file: File | null): boolean {
  if (!file) {
    return false;
  }
  return ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
}

export default function AccountScreen() {
  const dispatch = useDispatch();
  const statusId = useId();
  const user = useSelector((s: RootState) => s.auth.user);
  const userRef = useRef(user);
  userRef.current = user;
  const tenantId = user?.tenantId ?? null;
  const isOwner = user?.role === 'pharmacy_owner';

  const [pack, setPack] = useState<KycStatus | null>(null);
  const [status, setStatus] = useState<PageStatus>(tenantId && isOwner ? 'loading' : 'denied');

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

  const applyPack = useCallback(
    (next: KycStatus) => {
      setPack(next);
      if (next.status === 'SUBMITTED') {
        setStatus('submitted');
      } else if (next.status === 'REJECTED') {
        setStatus('rejected');
      } else if (next.status === 'APPROVED' || next.tenantStatus === 'ACTIVE') {
        setStatus('approved');
      } else {
        setStatus('empty');
      }
      const current = userRef.current;
      if (current && next.tenantStatus && next.tenantStatus !== current.tenantStatus) {
        dispatch(
          sessionStarted({
            ...current,
            tenantStatus: next.tenantStatus,
            emailVerified: next.emailVerified,
          }),
        );
      }
    },
    [dispatch],
  );

  const load = useCallback(async () => {
    if (!tenantId || !isOwner) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await getKycStatus(tenantId);
      applyPack(next);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
      }
      setStatus('failure');
    }
  }, [applyPack, isOwner, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSubmit =
    isOwner &&
    pack?.status !== 'SUBMITTED' &&
    pack?.status !== 'APPROVED' &&
    user?.tenantStatus === 'VERIFICATION_REQUIRED';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!tenantId || !canSubmit) {
      return;
    }
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
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const next = await submitKyc(tenantId, {
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
      });
      applyPack(next);
      setStatus('success');
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
        if (error.status === 409) {
          setStatus('conflict');
          return;
        }
      }
      setStatus('failure');
    }
  };

  const banner = statusCopy(status);

  return (
    <Reveal className="mx-auto max-w-2xl space-y-5">
      <div className="border-b border-line pb-4">
        <h1 className="text-xl font-semibold text-ink">Pharmacy account / KYC</h1>
        <p className="mt-1 text-sm text-muted">
          Upload licence evidence from this counter so HQ can unlock the floor.
        </p>
      </div>

      {banner ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <banner.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span>
            {status === 'rejected' && pack?.rejectionReason
              ? `${banner.text} Reason: ${pack.rejectionReason}`
              : banner.text}
          </span>
        </p>
      ) : null}

      {pack?.status === 'SUBMITTED' ? (
        <p className="text-sm text-muted" role="status">
          Pack waiting on HQ. Submitted documents:{' '}
          {pack.documents.map((doc) => doc.docType).join(', ') || 'none listed'}.
        </p>
      ) : null}

      {canSubmit ? (
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="legalName">Legal pharmacy name</Label>
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drugLicenseNumber">Drug licence number</Label>
              <Input
                id="drugLicenseNumber"
                className="font-mono"
                value={drugLicenseNumber}
                onChange={(e) => setDrugLicenseNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pan">PAN</Label>
              <Input
                id="pan"
                className="font-mono"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="gstin">GSTIN (optional)</Label>
              <Input
                id="gstin"
                className="font-mono"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="addressLine1">Branch address line</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                className="font-mono"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drugLicense">Drug licence file</Label>
              <Input
                id="drugLicense"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => setDrugLicense(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panDocument">PAN file</Label>
              <Input
                id="panDocument"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => setPanDocument(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="gstCertificate">GST certificate file</Label>
              <Input
                id="gstCertificate"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => setGstCertificate(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending pack…' : 'Submit KYC pack'}
          </Button>
        </form>
      ) : null}

      <p className="text-sm text-muted">
        Need the overview?{' '}
        <Link className="text-brand underline" to={ROUTES.DASHBOARD}>
          Back to counter overview
        </Link>
      </p>
    </Reveal>
  );
}

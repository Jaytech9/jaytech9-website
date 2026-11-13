import { Icon } from './Icon';
import { mail, tel, wa } from '../lib/contact';

export default function ContactButtons({ phone, email, name }: { phone?: string | null; email?: string | null; name: string }) {
  const first = name.split(' ')[0];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {phone && <a className="btn btn--sm btn--green" href={wa(phone, `Hello ${first}, this is JayTech9. `)} target="_blank" rel="noreferrer"><Icon name="chat" size={16} />WhatsApp</a>}
      {phone && <a className="btn btn--sm btn--secondary" href={tel(phone)}><Icon name="phone" size={16} />Call</a>}
      {email && <a className="btn btn--sm btn--secondary" href={mail(email, 'JayTech9')}><Icon name="mail" size={16} />Email</a>}
    </div>
  );
}

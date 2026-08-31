import { translate } from '@namma-medmate/i18n';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { whatsappMessages } from '../i18n/en.ts';
import { useListTemplatesQuery, type TemplateItem } from '../store/api/whatsapp-api.ts';

export interface TemplateCatalogueTableProps {
  skipQuery?: boolean;
  items?: TemplateItem[];
}

export function TemplateCatalogueTable({
  skipQuery = false,
  items: seededItems = [],
}: TemplateCatalogueTableProps) {
  const query = useListTemplatesQuery(undefined, { skip: skipQuery });
  const items = skipQuery ? seededItems : (query.data?.items ?? []);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">
        {translate(whatsappMessages, 'whatsapp.templates.title')}
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{translate(whatsappMessages, 'whatsapp.templates.key')}</TableHead>
            <TableHead>{translate(whatsappMessages, 'whatsapp.templates.body')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.template_key}>
              <TableCell>{item.template_key}</TableCell>
              <TableCell className="whitespace-normal">{item.body_preview_en}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

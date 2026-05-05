import MerchMatchWidget from '../widgets/MerchMatchWidget';
import QuoteDraftWidget from '../widgets/QuoteDraftWidget';
import QuoteListWidget from '../widgets/QuoteListWidget';
import QuotePreviewWidget from '../widgets/QuotePreviewWidget';

const WIDGET_MAP = {
  merch_match: MerchMatchWidget,
  quote_draft: QuoteDraftWidget,
  quote_list: QuoteListWidget,
  quote_preview: QuotePreviewWidget,
};

export default function WidgetBlock({ widgetType, data }) {
  const WidgetComponent = WIDGET_MAP[widgetType];

  if (!WidgetComponent) {
    return (
      <div className="askola-block-unknown">
        [Unknown widget: {widgetType}]
      </div>
    );
  }

  return (
    <div className="askola-block-widget">
      <WidgetComponent data={data} />
    </div>
  );
}

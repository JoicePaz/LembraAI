class DecksController < ApplicationController
  def start
    return redirect_to decks_path if Deck.exists?

    redirect_to new_deck_path
  end

  def index
    @query = params[:q].to_s.strip
    base_scope = Deck.includes(:flashcards).order(updated_at: :desc)

    if @query.present?
      like_query = "%#{@query}%"
      @decks = base_scope
        .left_outer_joins(:flashcards)
        .where(
          "decks.title LIKE :q OR decks.description LIKE :q OR flashcards.term LIKE :q OR flashcards.definition LIKE :q",
          q: like_query
        )
        .distinct

      return render :not_found if @decks.empty?
    else
      @decks = base_scope
    end
  end

  def new
    @has_decks = Deck.table_exists? && Deck.exists?
    @relative_time_label = "Last created"
    @relative_time_empty = "No decks created yet"
    @relative_time_timestamp = Deck.maximum(:created_at) if @has_decks
    @deck = Deck.new
    @deck.flashcards.build(position: 0)
  end

  def edit
    @has_decks = Deck.table_exists? && Deck.exists?
    @deck = Deck.includes(:flashcards).find(params[:id])
    set_edit_relative_time
    @deck.flashcards.build(position: 0) if @deck.flashcards.empty?
    render :new
  end

  def practice
    @deck = Deck.includes(:flashcards).find(params[:id])
  end

  def create
    if params[:commit_action] == "import" && params[:import_payload].present?
      return handle_import
    end

    @deck = Deck.new(deck_params)
    normalize_flashcard_positions

    if @deck.save
      return redirect_to practice_deck_path(@deck) if params[:commit_action] == "practice"
      return redirect_to(edit_deck_path(@deck), flash: { imported: true }) if params[:commit_action] == "import"

      flash[:saved] = true
      redirect_to new_deck_path
    else
      @has_decks = Deck.table_exists? && Deck.exists?
      @relative_time_label = "Last created"
      @relative_time_empty = "No decks created yet"
      @relative_time_timestamp = Deck.maximum(:created_at) if @has_decks
      @deck.flashcards.build(position: @deck.flashcards.length) if @deck.flashcards.empty?
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if params[:commit_action] == "import" && params[:import_payload].present?
      return handle_import
    end

    @deck = Deck.includes(:flashcards).find(params[:id])
    @has_decks = Deck.table_exists? && Deck.exists?
    set_edit_relative_time

    @deck.assign_attributes(deck_params)
    normalize_flashcard_positions

    if @deck.save
      return redirect_to practice_deck_path(@deck) if params[:commit_action] == "practice"
      return redirect_to(edit_deck_path(@deck), flash: { imported: true }) if params[:commit_action] == "import"

      flash[:saved] = true
      redirect_to edit_deck_path(@deck)
    else
      set_edit_relative_time
      @deck.flashcards.build(position: @deck.flashcards.length) if @deck.flashcards.empty?
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    deck = Deck.find(params[:id])
    deck.destroy

    redirect_to decks_path
  end

  private

  def deck_params
    permitted = params.require(:deck).permit(
      :title,
      :description,
      flashcards_attributes: [:id, :term, :definition, :position, :_destroy]
    )

    # If an existing flashcard is submitted with both fields blank, remove it.
    if permitted[:flashcards_attributes].present?
      permitted[:flashcards_attributes].each_value do |flashcard_attrs|
        next if flashcard_attrs[:id].blank?
        next unless flashcard_attrs[:term].blank? && flashcard_attrs[:definition].blank?

        flashcard_attrs[:_destroy] = "1"
      end
    end

    permitted
  end

  def normalize_flashcard_positions
    @deck.flashcards.reject(&:marked_for_destruction?).each_with_index do |flashcard, index|
      flashcard.position = index
    end
  end

  def set_edit_relative_time
    @relative_time_label = "Last updated"
    @relative_time_empty = "Never updated"
    @relative_time_timestamp = @deck.updated_at
  end

  def handle_import
    import_result = import_decks_from_payload(params[:import_payload])
    imported_decks = import_result[:created]
    duplicate_skipped = import_result[:duplicate_skipped]

    if imported_decks.length == 1 && duplicate_skipped.zero?
      redirect_to edit_deck_path(imported_decks.first), flash: { imported: true }
    else
      summary = "#{imported_decks.length} #{'deck'.pluralize(imported_decks.length)} imported successfully"
      summary = "#{summary}, #{duplicate_skipped} #{'duplicate'.pluralize(duplicate_skipped)} skipped" if duplicate_skipped.positive?
      redirect_to decks_path, flash: { import_summary: summary }
    end
  rescue JSON::ParserError, ArgumentError, ActiveRecord::RecordInvalid
    @deck = Deck.new
    @deck.flashcards.build(position: 0)
    @has_decks = Deck.table_exists? && Deck.exists?
    @relative_time_label = "Last created"
    @relative_time_empty = "No decks created yet"
    @relative_time_timestamp = Deck.maximum(:created_at) if @has_decks
    render :new, status: :unprocessable_entity
  end

  def import_decks_from_payload(raw_payload)
    payload = JSON.parse(raw_payload)
    decks = payload.is_a?(Hash) ? payload["decks"] : nil
    raise ArgumentError, "Wrong template format" unless decks.is_a?(Array) && decks.any?

    created = []
    duplicate_skipped = 0
    existing_titles = Deck.pluck(:title).map { |title| normalize_import_title(title) }
    imported_titles = []

    Deck.transaction do
      decks.each do |deck_data|
        raise ArgumentError, "Wrong template format" unless deck_data.is_a?(Hash)

        title = deck_data["title"].to_s.strip
        normalized_title = normalize_import_title(title)
        raise ArgumentError, "Wrong template format" if normalized_title.blank?

        if existing_titles.include?(normalized_title) || imported_titles.include?(normalized_title)
          duplicate_skipped += 1
          next
        end

        flashcards = deck_data["flashcards"]
        raise ArgumentError, "Wrong template format" unless flashcards.is_a?(Array)

        filtered_flashcards = flashcards
          .select { |card| card.is_a?(Hash) && card.key?("term") && card.key?("definition") }
          .map do |card|
            {
              term: card["term"].to_s.strip,
              definition: card["definition"].to_s.strip
            }
          end
          .select { |card| card[:term].present? || card[:definition].present? }

        raise ArgumentError, "Wrong template format" if filtered_flashcards.empty?

        deck = Deck.new(
          title: title,
          description: deck_data["description"].to_s.strip
        )

        filtered_flashcards.each_with_index do |card, index|
          deck.flashcards.build(
            term: card[:term],
            definition: card[:definition],
            position: index
          )
        end

        deck.save!
        created << deck
        imported_titles << normalized_title
      end
    end

    { created:, duplicate_skipped: }
  end

  def normalize_import_title(title)
    title.to_s.strip.downcase
  end
end

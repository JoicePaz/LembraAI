class HomeController < ApplicationController
  def index
    @has_decks = Deck.table_exists? && Deck.exists?
  end
end

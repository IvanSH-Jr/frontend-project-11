import * as yup from 'yup';
import onChange from 'on-change';
import i18next from 'i18next';
import axios from 'axios';

import view from './view.js';
import ru from './locales/ru.js';
import en from './locales/en.js';
import rssParser from './rssParser.js';

const allOrigin = (url) => `https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`;

export default () => {
  const defaultLanguage = 'ru';

  const instanceState = {
    appLng: defaultLanguage,
    rssForm: {
      status: 'filling', // sending succeed finished failed
      error: null, // all errors with form
    },
    feeds: [],
    lastFeedId: 0,
    postList: [],
    lastPostId: 0,
  };

  const domElements = {
    appName: document.querySelector('.app-name'),
    lead: document.querySelector('.lead'),
    rssForm: document.querySelector('.rss-form'),
    feedback: document.querySelector('.feedback'),
    rssInput: document.querySelector('#url-input'),
    rssInputPlaceholder: document.querySelector('[for="url-input"]'),
    sendBtn: document.querySelector('.btn-lg'),
    example: document.querySelector('.example'),
    feeds: document.querySelector('.feeds'),
    posts: document.querySelector('.posts'),
    modal: document.querySelectorAll('.modal'),
  };

  const i18nInstance = i18next.createInstance();
  i18nInstance.init({
    lng: defaultLanguage,
    debug: false,
    resources: {
      ru,
      en,
    },
  })
    .then(() => {
      const state = onChange(instanceState, view(instanceState, i18nInstance, domElements));

      const urlValidator = (feeds) => {
        const arrayOfUrls = feeds.map(({ url }) => url);
        return yup.object().shape({ url: yup.string().url().notOneOf(arrayOfUrls, 'duplicate') });
      };

      const downloadContent = (url) => {
        const allOriginUrl = allOrigin(url);
        const rssData = axios.get(allOriginUrl);
        return rssData
          .then((rss) => {
            const content = rssParser(rss.data.contents);
            state.rssForm.status = 'sent';
            return content;
          })
          .then(({ feed, posts }) => {
            const { title, description } = feed;
            const feedId = state.lastFeedId + 1;
            const hasFeed = state.feeds.filter((feedItem) => feedItem.title === title);
            if (hasFeed.length === 0) {
              state.lastFeedId = feedId;
              state.feeds.push({
                id: feedId, title, description, url,
              });
            }
            if (state.postList.length) {
              const newPost = posts
                .filter((post) => state.postList.every((item) => item.title !== post.title))
              newPost.forEach((post) => {
                state.lastPostId = state.lastPostId + 1;
                post.id = state.lastPostId;
              })
              state.postList.unshift(...newPost,);
              return;
            }
            posts.forEach((post) => {
              state.lastPostId = state.lastPostId + 1;
              post.id = state.lastPostId;
            })
            state.postList.push(...posts);
            state.rssForm.status = 'finished';
            domElements.readBtn = document.querySelectorAll('.btn-sm');
            domElements.readBtn.forEach((readBtn) => {
              readBtn.addEventListener('click', readBtnHandler);
            });
          })
          .then(() => {
            state.rssForm.error = null;
            state.rssForm.status = 'filling';
          })
          .catch((err) => {
            state.rssForm.error = err.message;
            state.rssForm.status = 'error';
          })
          .finally(() => setTimeout(downloadContent, 5000, url));
      };

      const readBtnHandler = (btn) => {
        console.log(btn.currentTarget)
      };

      domElements.rssForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = domElements.rssForm.elements.url.value.trim();
        const urlShape = urlValidator(state.feeds);
        urlShape.validate({ url })
          .then(() => {
            state.rssForm.status = 'sending';
            return downloadContent(url);
          })
          .catch((err) => {
            console.log(err.message);
            state.rssForm.error = err.message;
            state.rssForm.status = 'error';
          });
      });

    });
};
